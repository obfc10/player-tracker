import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'current';
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
      return NextResponse.json({ error: 'No snapshots found' }, { status: 404 });
    }

    let whereClause: any = {
      snapshotId: latestSnapshot.id
    };

    // For growth calculations, we need to compare with older snapshots within the same season scope
    let compareSnapshot = null;
    if (timeframe === 'week') {
      const weekAgo = new Date(latestSnapshot.timestamp.getTime() - (7 * 24 * 60 * 60 * 1000));
      compareSnapshot = await prisma.snapshot.findFirst({
        where: { 
          ...snapshotFilter,
          timestamp: { lte: weekAgo } 
        },
        orderBy: { timestamp: 'desc' }
      });
    } else if (timeframe === 'month') {
      const monthAgo = new Date(latestSnapshot.timestamp.getTime() - (30 * 24 * 60 * 60 * 1000));
      compareSnapshot = await prisma.snapshot.findFirst({
        where: { 
          ...snapshotFilter,
          timestamp: { lte: monthAgo } 
        },
        orderBy: { timestamp: 'desc' }
      });
    }

    // Get current player data
    const currentPlayers = await prisma.playerSnapshot.findMany({
      where: whereClause,
      include: {
        player: {
          select: {
            lordId: true,
            currentName: true
          }
        }
      }
    });

    // Calculate merit analytics for each player
    const playersWithMetrics = currentPlayers.map(snapshot => {
      const merits = parseInt(snapshot.merits || '0');
      const power = parseInt(snapshot.currentPower || '0');
      const kills = parseInt(snapshot.unitsKilled || '0');
      
      return {
        playerId: snapshot.playerId,
        name: snapshot.name,
        currentName: snapshot.player.currentName,
        allianceTag: snapshot.allianceTag,
        division: snapshot.division || 0,
        cityLevel: snapshot.cityLevel || 0,
        merits: snapshot.merits,
        currentPower: snapshot.currentPower,
        unitsKilled: snapshot.unitsKilled,
        meritPowerRatio: power > 0 ? Math.min((merits / power) * 100, 999999) : 0,
        meritKillRatio: kills > 0 ? Math.min(merits / kills, 999999) : 0,
        meritPerCityLevel: (snapshot.cityLevel || 0) > 0 ? Math.min(merits / (snapshot.cityLevel || 1), 999999) : 0,
        rawMerits: merits,
        rawPower: power,
        rawKills: kills
      };
    });

    // Add growth calculations if comparing timeframes
    let playersWithGrowth = playersWithMetrics;
    if (compareSnapshot) {
      const oldPlayers = await prisma.playerSnapshot.findMany({
        where: { snapshotId: compareSnapshot.id },
        select: {
          playerId: true,
          merits: true
        }
      });

      const oldMeritsMap = new Map(
        oldPlayers.map(p => [p.playerId, parseInt(p.merits || '0')])
      );

      playersWithGrowth = playersWithMetrics.map(player => {
        const oldMerits = oldMeritsMap.get(player.playerId) || 0;
        const growth = player.rawMerits - oldMerits;
        let growthPercent = oldMerits > 0 ? (growth / oldMerits) * 100 : 0;
        
        // Ensure growthPercent is a valid number
        if (!isFinite(growthPercent) || isNaN(growthPercent)) {
          growthPercent = 0;
        }

        return {
          ...player,
          meritGrowth: growth,
          meritGrowthPercent: growthPercent
        };
      });
    }

    // Sort and get top players for each category
    const topMerits = [...playersWithGrowth]
      .sort((a, b) => b.rawMerits - a.rawMerits)
      .slice(0, 50);

    const topEfficiency = [...playersWithGrowth]
      .filter(p => p.rawPower >= 1000000) // Only include players with 1M+ power for efficiency
      .sort((a, b) => b.meritPowerRatio - a.meritPowerRatio)
      .slice(0, 50);

    const topKillEfficiency = [...playersWithGrowth]
      .filter(p => p.rawKills > 0)
      .sort((a, b) => b.meritKillRatio - a.meritKillRatio)
      .slice(0, 50);

    const topGrowth = timeframe !== 'current' ? [...playersWithGrowth]
      .filter(p => (p as any).meritGrowth !== undefined && (p as any).meritGrowth > 0)
      .sort((a, b) => ((b as any).meritGrowth || 0) - ((a as any).meritGrowth || 0))
      .slice(0, 50) : [];

    // Calculate kingdom statistics
    const totalMerits = playersWithMetrics.reduce((sum, p) => sum + p.rawMerits, 0);
    const averageMerits = playersWithMetrics.length > 0 ? totalMerits / playersWithMetrics.length : 0;
    const validEfficiencyPlayers = playersWithMetrics.filter(p => p.rawPower >= 1000000);
    const averageEfficiency = validEfficiencyPlayers.length > 0 
      ? validEfficiencyPlayers.reduce((sum, p) => sum + p.meritPowerRatio, 0) / validEfficiencyPlayers.length 
      : 0;

    return NextResponse.json({
      topMerits,
      topEfficiency,
      topKillEfficiency,
      topGrowth,
      kingdomStats: {
        totalMerits: totalMerits.toString(),
        averageMerits: Math.round(averageMerits),
        averageEfficiency: averageEfficiency,
        totalPlayers: playersWithMetrics.length
      },
      timeframe: timeframe === 'current' ? `Current (${latestSnapshot?.timestamp?.toISOString().split('T')[0] || 'Unknown'})` 
        : timeframe === 'week' ? 'Past 7 Days' 
        : 'Past 30 Days'
    });

  } catch (error) {
    console.error('Error fetching merit data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch merit analytics' },
      { status: 500 }
    );
  }
}