import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const seasonMode = searchParams.get('seasonMode') || 'current';
    const seasonId = searchParams.get('seasonId');

    // Determine which snapshots to query based on season selection
    let snapshotFilter: any = {};
    
    if (seasonMode === 'current' || seasonMode === 'specific') {
      // Get snapshots from specific season
      const targetSeasonId = seasonMode === 'specific' && seasonId 
        ? seasonId 
        : (await prisma.season.findFirst({ where: { isActive: true } }))?.id;
      
      if (targetSeasonId) {
        snapshotFilter.seasonId = targetSeasonId;
      }
    }
    // For 'all-time' mode, we don't add any season filter

    // Get the latest snapshot within the selected season/scope
    const latestSnapshot = await prisma.snapshot.findFirst({
      where: snapshotFilter,
      orderBy: { timestamp: 'desc' },
      include: {
        players: {
          include: {
            player: true
          }
        }
      }
    });

    if (!latestSnapshot) {
      return NextResponse.json({
        totalPlayers: 0,
        activeAlliances: 0,
        totalPower: 0,
        lastUpdate: null,
        recentUploads: 0,
        allianceDistribution: [],
        topPlayers: [],
        powerDistribution: [
          { label: '0-1M', count: 0 },
          { label: '1M-10M', count: 0 },
          { label: '10M-50M', count: 0 },
          { label: '50M-100M', count: 0 },
          { label: '100M+', count: 0 }
        ],
        snapshotInfo: null
      });
    }

    // Calculate basic stats
    const totalPlayers = latestSnapshot.players.length;
    
    // Get unique alliances
    const alliances = new Set(
      latestSnapshot.players
        .map((p: any) => p.allianceTag)
        .filter((tag: any) => tag && tag.trim() !== '')
    );
    const activeAlliances = alliances.size;

    // Calculate total kingdom power
    const totalPower = latestSnapshot.players.reduce((sum: number, player: any) => {
      return sum + parseInt(player.currentPower || '0');
    }, 0);

    // Get recent uploads count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUploads = await prisma.upload.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        },
        status: 'COMPLETED'
      }
    });

    // Get alliance distribution for charts
    const allianceDistribution = Array.from(alliances).map(alliance => {
      const memberCount = latestSnapshot.players.filter((p: any) => p.allianceTag === alliance).length;
      const alliancePower = latestSnapshot.players
        .filter((p: any) => p.allianceTag === alliance)
        .reduce((sum: number, player: any) => sum + parseInt(player.currentPower || '0'), 0);
      
      return {
        name: alliance,
        memberCount,
        totalPower: alliancePower
      };
    }).sort((a, b) => b.totalPower - a.totalPower).slice(0, 10); // Top 10 alliances

    // Get top players
    const topPlayers = latestSnapshot.players
      .sort((a: any, b: any) => parseInt(b.currentPower || '0') - parseInt(a.currentPower || '0'))
      .slice(0, 10)
      .map((player: any) => ({
        lordId: player.playerId,
        name: player.name,
        currentPower: parseInt(player.currentPower || '0'),
        allianceTag: player.allianceTag
      }));

    // Power distribution ranges
    const powerRanges = [
      { label: '0-1M', min: 0, max: 1000000, count: 0 },
      { label: '1M-10M', min: 1000000, max: 10000000, count: 0 },
      { label: '10M-50M', min: 10000000, max: 50000000, count: 0 },
      { label: '50M-100M', min: 50000000, max: 100000000, count: 0 },
      { label: '100M+', min: 100000000, max: Infinity, count: 0 }
    ];

    latestSnapshot.players.forEach((player: any) => {
      const power = parseInt(player.currentPower || '0');
      for (const range of powerRanges) {
        if (power >= range.min && power < range.max) {
          range.count++;
          break;
        }
      }
    });

    return NextResponse.json({
      totalPlayers,
      activeAlliances,
      totalPower,
      lastUpdate: latestSnapshot.timestamp,
      recentUploads,
      allianceDistribution,
      topPlayers,
      powerDistribution: powerRanges,
      snapshotInfo: {
        kingdom: latestSnapshot.kingdom,
        filename: latestSnapshot.filename,
        timestamp: latestSnapshot.timestamp
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}