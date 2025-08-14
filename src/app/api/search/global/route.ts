import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SearchResult {
  type: 'player' | 'alliance';
  id: string;
  title: string;
  subtitle: string;
  power?: number;
  memberCount?: number;
  url: string;
  relevance: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    if (!query || query.length < 2) {
      return NextResponse.json({
        results: [],
        query: query || '',
        totalResults: 0
      });
    }

    // Get the latest snapshot for current data
    const latestSnapshot = await prisma.snapshot.findFirst({
      orderBy: { timestamp: 'desc' }
    });

    if (!latestSnapshot) {
      return NextResponse.json({
        results: [],
        query,
        totalResults: 0,
        error: 'No data available'
      });
    }

    const results: SearchResult[] = [];

    // Search players by name, current name, or lord ID
    const playerSnapshots = await prisma.playerSnapshot.findMany({
      where: {
        snapshotId: latestSnapshot.id,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { playerId: { contains: query, mode: 'insensitive' } },
          { player: { currentName: { contains: query, mode: 'insensitive' } } }
        ]
      },
      include: {
        player: {
          include: {
            nameHistory: {
              where: {
                OR: [
                  { oldName: { contains: query, mode: 'insensitive' } },
                  { newName: { contains: query, mode: 'insensitive' } }
                ]
              },
              orderBy: { detectedAt: 'desc' },
              take: 1
            }
          }
        }
      },
      orderBy: [
        { currentPower: 'desc' },
        { name: 'asc' }
      ],
      take: limit
    });

    // Process player results
    playerSnapshots.forEach(snapshot => {
      const relevance = calculatePlayerRelevance(snapshot, query);
      
      // Main player result
      results.push({
        type: 'player',
        id: snapshot.playerId,
        title: snapshot.name,
        subtitle: `${snapshot.allianceTag || 'No Alliance'} • ${formatPower(parseInt(snapshot.currentPower))} Power • ID: ${snapshot.playerId}`,
        power: parseInt(snapshot.currentPower),
        url: `/dashboard/player/${snapshot.playerId}`,
        relevance
      });

      // Add name history matches if different from current name
      if (snapshot.player.nameHistory.length > 0) {
        const nameChange = snapshot.player.nameHistory[0];
        if (nameChange.oldName !== snapshot.name || nameChange.newName !== snapshot.name) {
          results.push({
            type: 'player',
            id: `${snapshot.playerId}-name`,
            title: `${snapshot.name} (formerly: ${nameChange.oldName})`,
            subtitle: `Name changed • ${snapshot.allianceTag || 'No Alliance'} • ${formatPower(parseInt(snapshot.currentPower))} Power`,
            power: parseInt(snapshot.currentPower),
            url: `/dashboard/player/${snapshot.playerId}`,
            relevance: relevance * 0.8 // Slightly lower relevance for name history
          });
        }
      }
    });

    // Search alliances by tag - get unique alliances first
    const allianceMatches = await prisma.playerSnapshot.findMany({
      where: {
        snapshotId: latestSnapshot.id,
        allianceTag: {
          not: null,
          contains: query,
          mode: 'insensitive'
        }
      },
      select: {
        allianceTag: true,
        currentPower: true
      },
      distinct: ['allianceTag']
    });

    // Group and calculate alliance statistics
    const allianceMap = new Map<string, { memberCount: number; totalPower: number }>();
    
    for (const match of allianceMatches) {
      if (match.allianceTag) {
        // Get all members of this alliance to calculate stats
        const allianceMembers = await prisma.playerSnapshot.findMany({
          where: {
            snapshotId: latestSnapshot.id,
            allianceTag: match.allianceTag
          },
          select: {
            currentPower: true
          }
        });

        const memberCount = allianceMembers.length;
        const totalPower = allianceMembers.reduce((sum, member) => {
          const power = parseInt(member.currentPower || '0');
          return sum + (isNaN(power) ? 0 : power);
        }, 0);

        allianceMap.set(match.allianceTag, { memberCount, totalPower });
      }
    }

    // Process alliance results
    const sortedAlliances = Array.from(allianceMap.entries())
      .sort(([, a], [, b]) => b.totalPower - a.totalPower)
      .slice(0, Math.floor(limit / 3));

    for (const [allianceTag, stats] of sortedAlliances) {
      const relevance = calculateAllianceRelevance(allianceTag, query);
      
      results.push({
        type: 'alliance',
        id: allianceTag,
        title: allianceTag,
        subtitle: `Alliance • ${stats.memberCount} members • ${formatPower(stats.totalPower)} total power`,
        memberCount: stats.memberCount,
        power: stats.totalPower,
        url: `/dashboard/players?alliance=${encodeURIComponent(allianceTag)}`,
        relevance
      });
    }

    // Sort by relevance and limit results
    const sortedResults = results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);

    return NextResponse.json({
      results: sortedResults,
      query,
      totalResults: sortedResults.length,
      snapshotInfo: {
        id: latestSnapshot.id,
        timestamp: latestSnapshot.timestamp,
        kingdom: latestSnapshot.kingdom,
        filename: latestSnapshot.filename
      }
    });

  } catch (error) {
    console.error('Error in global search:', error);
    return NextResponse.json(
      { error: 'Search failed', results: [], query: '', totalResults: 0 },
      { status: 500 }
    );
  }
}

function calculatePlayerRelevance(snapshot: any, query: string): number {
  const lowerQuery = query.toLowerCase();
  let relevance = 0;

  // Exact matches get highest score
  if (snapshot.name.toLowerCase() === lowerQuery) relevance += 100;
  else if (snapshot.name.toLowerCase().startsWith(lowerQuery)) relevance += 80;
  else if (snapshot.name.toLowerCase().includes(lowerQuery)) relevance += 60;

  // Current name matches
  if (snapshot.player.currentName.toLowerCase() === lowerQuery) relevance += 90;
  else if (snapshot.player.currentName.toLowerCase().startsWith(lowerQuery)) relevance += 70;
  else if (snapshot.player.currentName.toLowerCase().includes(lowerQuery)) relevance += 50;

  // Lord ID exact match
  if (snapshot.playerId.toLowerCase() === lowerQuery) relevance += 95;
  else if (snapshot.playerId.toLowerCase().includes(lowerQuery)) relevance += 40;

  // Boost relevance based on power (higher power = more relevant)
  const power = parseInt(snapshot.currentPower);
  if (power > 100000000) relevance += 20; // 100M+
  else if (power > 50000000) relevance += 15; // 50M+
  else if (power > 10000000) relevance += 10; // 10M+
  else if (power > 1000000) relevance += 5; // 1M+

  return relevance;
}

function calculateAllianceRelevance(allianceTag: string, query: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerTag = allianceTag.toLowerCase();
  
  if (lowerTag === lowerQuery) return 100;
  if (lowerTag.startsWith(lowerQuery)) return 80;
  if (lowerTag.includes(lowerQuery)) return 60;
  
  return 40;
}

function formatPower(power: number): string {
  if (power >= 1000000000) return `${(power / 1000000000).toFixed(1)}B`;
  if (power >= 1000000) return `${(power / 1000000).toFixed(1)}M`;
  if (power >= 1000) return `${(power / 1000).toFixed(1)}K`;
  return power.toLocaleString();
}