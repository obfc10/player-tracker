import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PlayerAnalyticsService } from '@/services/PlayerAnalyticsService';

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
      const targetSeasonId = seasonMode === 'specific' && seasonId 
        ? seasonId 
        : (await prisma.season.findFirst({ where: { isActive: true } }))?.id;
      
      if (targetSeasonId) {
        snapshotFilter.seasonId = targetSeasonId;
      }
    }

    // Get the latest snapshot within the selected season/scope
    const latestSnapshot = await prisma.snapshot.findFirst({
      where: snapshotFilter,
      orderBy: { timestamp: 'desc' }
    });

    if (!latestSnapshot) {
      return NextResponse.json({
        error: 'No snapshot data available'
      }, { status: 404 });
    }

    // Get previous snapshot for trend calculation (5 days ago)
    const fiveDaysAgo = new Date(latestSnapshot.timestamp);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const previousSnapshots = await prisma.snapshot.findMany({
      where: {
        ...snapshotFilter,
        timestamp: {
          gte: fiveDaysAgo,
          lt: latestSnapshot.timestamp
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 5
    });

    // Get PLAC and FLAs player data
    const [placPlayers, flasPlayers] = await Promise.all([
      prisma.playerSnapshot.findMany({
        where: {
          snapshotId: latestSnapshot.id,
          allianceTag: 'PLAC'
        },
        include: {
          player: {
            select: {
              currentName: true,
              hasLeftRealm: true
            }
          }
        }
      }),
      prisma.playerSnapshot.findMany({
        where: {
          snapshotId: latestSnapshot.id,
          allianceTag: 'FLAs'
        },
        include: {
          player: {
            select: {
              currentName: true,
              hasLeftRealm: true
            }
          }
        }
      })
    ]);

    // Get historical data for trend calculation
    const getPlayerTrends = async (playerIds: string[]) => {
      const trends = new Map<string, number[]>();
      
      for (const snapshot of previousSnapshots) {
        const historicalData = await prisma.playerSnapshot.findMany({
          where: {
            snapshotId: snapshot.id,
            playerId: { in: playerIds }
          },
          select: {
            playerId: true,
            merits: true
          }
        });

        historicalData.forEach(data => {
          if (!trends.has(data.playerId)) {
            trends.set(data.playerId, []);
          }
          trends.get(data.playerId)!.push(parseInt(data.merits || '0'));
        });
      }

      // Calculate trend differences
      const trendDiffs = new Map<string, number[]>();
      trends.forEach((values, playerId) => {
        const diffs = [];
        for (let i = 1; i < values.length; i++) {
          diffs.push(values[i] - values[i - 1]);
        }
        trendDiffs.set(playerId, diffs);
      });

      return trendDiffs;
    };

    const allPlayerIds = [...placPlayers, ...flasPlayers].map(p => p.playerId);
    const playerTrends = await getPlayerTrends(allPlayerIds);

    // Calculate player metrics
    const calculatePlayerMetrics = (playerSnapshot: any) => {
      const power = parseInt(playerSnapshot.currentPower || '0');
      const merits = parseInt(playerSnapshot.merits || '0');
      const kills = parseInt(playerSnapshot.unitsKilled || '0');
      const deaths = parseInt(playerSnapshot.unitsDead || '0');

      // Merit efficiency (merits per million power)
      const meritEfficiency = power > 0 ? (merits / (power / 1000000)) : 0;
      
      // Power efficiency (kills per million power)
      const powerEfficiency = power > 0 ? (kills / (power / 1000000)) : 0;

      // Determine performance tier based on merit efficiency
      const isUnderperformer = meritEfficiency < 0.5;
      
      // Risk level based on multiple factors
      let riskLevel: 'none' | 'yellow' | 'red' = 'none';
      if (meritEfficiency < 0.3 || (deaths > 0 && kills / deaths < 1)) {
        riskLevel = 'red';
      } else if (meritEfficiency < 0.5 || (deaths > 0 && kills / deaths < 2)) {
        riskLevel = 'yellow';
      }

      const trend = playerTrends.get(playerSnapshot.playerId) || [0, 0, 0, 0, 0];

      return {
        rank: 0, // Will be set later
        lordId: playerSnapshot.playerId,
        name: playerSnapshot.name,
        currentName: playerSnapshot.player?.currentName || playerSnapshot.name,
        allianceTag: playerSnapshot.allianceTag,
        currentPower: power,
        merits,
        unitsKilled: kills,
        meritEfficiency,
        powerEfficiency,
        isUnderperformer,
        riskLevel,
        performanceTier: meritEfficiency > 1.0 ? 'top' : meritEfficiency > 0.5 ? 'middle' : 'bottom',
        meritTrend: trend
      };
    };

    // Process players
    const placPlayersWithMetrics = placPlayers.map(calculatePlayerMetrics);
    const flasPlayersWithMetrics = flasPlayers.map(calculatePlayerMetrics);
    const allPlayers = [...placPlayersWithMetrics, ...flasPlayersWithMetrics];

    // Sort by merits and assign ranks
    allPlayers.sort((a, b) => b.merits - a.merits);
    allPlayers.forEach((player, index) => {
      player.rank = index + 1;
    });

    // Calculate alliance statistics
    const calculateAllianceStats = (players: any[], tag: string) => {
      const totalMerits = players.reduce((sum, p) => sum + p.merits, 0);
      const totalPower = players.reduce((sum, p) => sum + p.currentPower, 0);
      const averageMerits = players.length > 0 ? totalMerits / players.length : 0;
      const averagePower = players.length > 0 ? totalPower / players.length : 0;
      const meritEfficiency = totalPower > 0 ? (totalMerits / (totalPower / 1000000)) : 0;

      // Get top performers (sorted by merits)
      const topPerformers = [...players]
        .sort((a, b) => b.merits - a.merits)
        .slice(0, 10);

      // Get underperformers
      const underperformers = players.filter(p => p.isUnderperformer);

      return {
        tag,
        totalMerits,
        averageMerits,
        memberCount: players.length,
        totalPower,
        averagePower,
        meritEfficiency,
        topPerformers,
        underperformers
      };
    };

    const placStats = calculateAllianceStats(placPlayersWithMetrics, 'PLAC');
    const flasStats = calculateAllianceStats(flasPlayersWithMetrics, 'FLAs');

    // Calculate comparison metrics
    const comparison = {
      meritDifference: placStats.totalMerits - flasStats.totalMerits,
      powerDifference: placStats.totalPower - flasStats.totalPower,
      efficiencyDifference: placStats.meritEfficiency - flasStats.meritEfficiency
    };

    const responseData = {
      plac: placStats,
      flas: flasStats,
      comparison,
      allPlayers,
      snapshotInfo: {
        id: latestSnapshot.id,
        timestamp: latestSnapshot.timestamp,
        kingdom: latestSnapshot.kingdom,
        filename: latestSnapshot.filename
      }
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error fetching alliance comparison data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alliance comparison data' },
      { status: 500 }
    );
  }
}