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
    const sortBy = searchParams.get('sortBy') || 'totalPower';
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
    const limit = parseInt(searchParams.get('limit') || '50');
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
      orderBy: { timestamp: 'desc' }
    });

    if (!latestSnapshot) {
      return NextResponse.json({
        alliances: [],
        snapshotInfo: null
      });
    }

    // Get all players from the latest snapshot
    const players = await prisma.playerSnapshot.findMany({
      where: {
        snapshotId: latestSnapshot.id,
        allianceTag: {
          not: null
        }
      }
    });

    // Group players by alliance and calculate metrics
    const allianceMap = new Map();

    players.forEach((player: any) => {
      const allianceTag = player.allianceTag;
      if (!allianceTag) return;

      if (!allianceMap.has(allianceTag)) {
        allianceMap.set(allianceTag, {
          tag: allianceTag,
          memberCount: 0,
          totalPower: 0,
          averagePower: 0,
          totalKills: 0,
          totalDeaths: 0,
          totalMerits: 0,
          totalVictories: 0,
          totalDefeats: 0,
          totalHelps: 0,
          totalResources: 0,
          averageLevel: 0,
          killDeathRatio: 0,
          winRate: 0,
          topPlayer: { name: '', power: 0 },
          members: []
        });
      }

      const alliance = allianceMap.get(allianceTag);
      const currentPower = parseInt(player.currentPower || '0');
      const unitsKilled = parseInt(player.unitsKilled || '0');
      const unitsDead = parseInt(player.unitsDead || '0');
      const merits = parseInt(player.merits || '0');
      const victories = player.victories || 0;
      const defeats = player.defeats || 0;
      const helps = player.helpsGiven || 0;
      const cityLevel = player.cityLevel || 0;

      // Add member to alliance
      alliance.members.push({
        name: player.name,
        lordId: player.playerId,
        power: currentPower,
        cityLevel: cityLevel
      });

      alliance.memberCount++;
      alliance.totalPower += currentPower;
      alliance.totalKills += unitsKilled;
      alliance.totalDeaths += unitsDead;
      alliance.totalMerits += merits;
      alliance.totalVictories += victories;
      alliance.totalDefeats += defeats;
      alliance.totalHelps += helps;
      alliance.totalResources += 
        parseInt(player.gold || '0') +
        parseInt(player.wood || '0') +
        parseInt(player.ore || '0') +
        parseInt(player.mana || '0') +
        parseInt(player.gems || '0');

      // Track top player
      if (currentPower > alliance.topPlayer.power) {
        alliance.topPlayer = {
          name: player.name,
          power: currentPower,
          lordId: player.playerId
        };
      }

      // Update average level
      alliance.averageLevel = alliance.averageLevel + 
        ((cityLevel - alliance.averageLevel) / alliance.memberCount);
    });

    // Calculate final metrics for each alliance
    const alliances = Array.from(allianceMap.values()).map(alliance => {
      alliance.averagePower = Math.round(alliance.totalPower / alliance.memberCount);
      alliance.averageLevel = Math.round(alliance.averageLevel);
      alliance.killDeathRatio = alliance.totalDeaths > 0 ? 
        (alliance.totalKills / alliance.totalDeaths).toFixed(2) : 'N/A';
      alliance.winRate = (alliance.totalVictories + alliance.totalDefeats) > 0 ? 
        ((alliance.totalVictories / (alliance.totalVictories + alliance.totalDefeats)) * 100).toFixed(1) : 'N/A';

      return alliance;
    });

    // Sort alliances based on selected metric
    alliances.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'memberCount':
          aVal = a.memberCount;
          bVal = b.memberCount;
          break;
        case 'averagePower':
          aVal = a.averagePower;
          bVal = b.averagePower;
          break;
        case 'totalKills':
          aVal = a.totalKills;
          bVal = b.totalKills;
          break;
        case 'totalMerits':
          aVal = a.totalMerits;
          bVal = b.totalMerits;
          break;
        case 'killDeathRatio':
          aVal = parseFloat(a.killDeathRatio === 'N/A' ? '0' : a.killDeathRatio);
          bVal = parseFloat(b.killDeathRatio === 'N/A' ? '0' : b.killDeathRatio);
          break;
        case 'winRate':
          aVal = parseFloat(a.winRate === 'N/A' ? '0' : a.winRate);
          bVal = parseFloat(b.winRate === 'N/A' ? '0' : b.winRate);
          break;
        case 'averageLevel':
          aVal = a.averageLevel;
          bVal = b.averageLevel;
          break;
        case 'tag':
          aVal = a.tag;
          bVal = b.tag;
          break;
        case 'totalPower':
        default:
          aVal = a.totalPower;
          bVal = b.totalPower;
          break;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return order === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Add rank to each alliance
    const rankedAlliances = alliances.slice(0, limit).map((alliance, index) => ({
      ...alliance,
      rank: index + 1
    }));

    return NextResponse.json({
      alliances: rankedAlliances,
      totalAlliances: alliances.length,
      sortBy,
      order,
      snapshotInfo: {
        id: latestSnapshot.id,
        timestamp: latestSnapshot.timestamp,
        kingdom: latestSnapshot.kingdom,
        filename: latestSnapshot.filename
      }
    });

  } catch (error) {
    console.error('Error fetching alliance leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alliance leaderboard data' },
      { status: 500 }
    );
  }
}