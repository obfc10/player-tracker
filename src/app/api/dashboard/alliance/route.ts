import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PlayerAnalyticsService } from '@/services/PlayerAnalyticsService';
import { prisma } from '@/lib/db';
import { MANAGED_ALLIANCES } from '@/lib/alliance-config';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const seasonMode = searchParams.get('seasonMode') || 'current';
    const seasonId = searchParams.get('seasonId');
    const filter = searchParams.get('filter') || 'combined';

    // Determine which alliances to include based on filter
    let allianceTags: string[];
    switch (filter) {
      case 'plac':
        allianceTags = ['PLAC'];
        break;
      case 'flas':
        allianceTags = ['FLAs'];
        break;
      case 'combined':
      default:
        allianceTags = ['PLAC', 'FLAs'];
        break;
    }

    // Get the latest snapshot(s) based on season mode
    let snapshots;
    if (seasonMode === 'current') {
      snapshots = await prisma.snapshot.findMany({
        orderBy: { timestamp: 'desc' },
        take: 2, // Current and previous for comparison
        include: {
          players: {
            where: {
              allianceTag: { in: allianceTags }
            },
            include: {
              player: true
            }
          }
        }
      });
    } else if (seasonId) {
      snapshots = await prisma.snapshot.findMany({
        where: { seasonId },
        orderBy: { timestamp: 'desc' },
        take: 2,
        include: {
          players: {
            where: {
              allianceTag: { in: allianceTags }
            },
            include: {
              player: true
            }
          }
        }
      });
    } else {
      return NextResponse.json({ error: 'Invalid season parameters' }, { status: 400 });
    }

    if (!snapshots || snapshots.length === 0) {
      return NextResponse.json({ error: 'No data available' }, { status: 404 });
    }

    const currentSnapshot = snapshots[0];
    const previousSnapshot = snapshots[1];
    const currentPlayers = currentSnapshot.players;
    const previousPlayers = previousSnapshot?.players || [];

    // Initialize analytics service
    const analyticsService = new PlayerAnalyticsService();

    // Calculate KPIs
    const totalCombinedPower = currentPlayers.reduce((sum: number, player: any) => {
      return sum + parseNumericValue(player.currentPower);
    }, 0);

    // Calculate power trend (comparison with previous snapshot)
    const previousTotalPower = previousPlayers.reduce((sum: number, player: any) => {
      return sum + parseNumericValue(player.currentPower);
    }, 0);
    const powerTrend = totalCombinedPower - previousTotalPower;

    // Calculate active members by alliance
    const membersByAlliance = new Map<string, number>();
    currentPlayers.forEach((player: any) => {
      const alliance = player.allianceTag || 'Unknown';
      membersByAlliance.set(alliance, (membersByAlliance.get(alliance) || 0) + 1);
    });

    const activeMembers = {
      total: currentPlayers.length,
      byAlliance: Array.from(membersByAlliance.entries()).map(([alliance, count]) => ({
        alliance,
        count
      }))
    };

    // Calculate average K/D ratio
    const validKDRatios = currentPlayers
      .map((player: any) => {
        const kills = parseNumericValue(player.unitsKilled);
        const deaths = parseNumericValue(player.unitsDead);
        return deaths > 0 ? kills / deaths : kills > 0 ? kills : 0;
      })
      .filter((ratio: number) => ratio > 0);
    
    const averageKDRatio = validKDRatios.length > 0
      ? validKDRatios.reduce((sum: number, ratio: number) => sum + ratio, 0) / validKDRatios.length
      : 0;

    // Calculate power distribution
    const powerByAlliance = new Map<string, number>();
    currentPlayers.forEach((player: any) => {
      const alliance = player.allianceTag || 'Unknown';
      const power = parseNumericValue(player.currentPower);
      powerByAlliance.set(alliance, (powerByAlliance.get(alliance) || 0) + power);
    });

    const powerDistribution = {
      allianceBreakdown: Array.from(powerByAlliance.entries()).map(([alliance, power]) => ({
        alliance,
        power,
        percentage: (power / totalCombinedPower) * 100
      })),
      powerBrackets: calculatePowerBrackets(currentPlayers)
    };

    // Calculate activity status
    const activityStatus = calculateActivityStatus(currentPlayers, previousPlayers);

    // Calculate performance alerts
    const performanceAlerts = calculatePerformanceAlerts(currentPlayers);

    // Count critical alerts
    const criticalAlerts = activityStatus.filter(p => p.status === 'inactive').length +
                          performanceAlerts.plac.filter(a => a.severity === 'critical').length +
                          performanceAlerts.flas.filter(a => a.severity === 'critical').length;

    const dashboardData = {
      kpis: {
        totalCombinedPower,
        powerTrend,
        activeMembers,
        averageKDRatio,
        criticalAlerts
      },
      powerDistribution,
      activityStatus,
      performanceAlerts,
      snapshotInfo: {
        timestamp: currentSnapshot.timestamp.toISOString(),
        kingdom: currentSnapshot.kingdom,
        filename: currentSnapshot.filename
      }
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Alliance dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
function parseNumericValue(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function calculatePowerBrackets(players: any[]) {
  const brackets = [
    { bracket: '<5M', min: 0, max: 5000000 },
    { bracket: '5-10M', min: 5000000, max: 10000000 },
    { bracket: '10-20M', min: 10000000, max: 20000000 },
    { bracket: '20-50M', min: 20000000, max: 50000000 },
    { bracket: '>50M', min: 50000000, max: null }
  ];

  return brackets.map(bracket => {
    const playersInBracket = players.filter(player => {
      const power = parseNumericValue(player.currentPower);
      if (bracket.max === null) {
        return power >= bracket.min;
      }
      return power >= bracket.min && power < bracket.max;
    });

    return {
      bracket: bracket.bracket,
      count: playersInBracket.length,
      players: playersInBracket.map(player => ({
        playerId: player.playerId,
        name: player.name,
        power: parseNumericValue(player.currentPower)
      }))
    };
  });
}

function calculateActivityStatus(currentPlayers: any[], previousPlayers: any[]) {
  const previousMap = new Map(previousPlayers.map(p => [p.playerId, p]));
  
  return currentPlayers.map(player => {
    const previous = previousMap.get(player.playerId);
    const currentPower = parseNumericValue(player.currentPower);
    const previousPower = previous ? parseNumericValue(previous.currentPower) : currentPower;
    const powerGrowth = currentPower - previousPower;
    
    // Simple activity calculation based on power growth
    // In a real implementation, you might use more sophisticated metrics
    let status: 'active' | 'low_activity' | 'inactive';
    let daysSinceActive = 0;
    
    if (powerGrowth > 100000) { // Significant power growth
      status = 'active';
    } else if (powerGrowth > 0) { // Some power growth
      status = 'low_activity';
      daysSinceActive = 1;
    } else { // No power growth
      status = 'inactive';
      daysSinceActive = 2; // Assume 2+ days for inactive
    }

    return {
      playerId: player.playerId,
      name: player.name,
      alliance: player.allianceTag || 'Unknown',
      power: currentPower,
      lastActive: previous?.snapshot?.timestamp || player.snapshot?.timestamp || new Date().toISOString(),
      status,
      daysSinceActive
    };
  });
}

function calculatePerformanceAlerts(players: any[]) {
  const placPlayers = players.filter(p => p.allianceTag === 'PLAC');
  const flasPlayers = players.filter(p => p.allianceTag === 'FLAs');

  const analyzePerformance = (playerList: any[]) => {
    return playerList
      .map(player => {
        const kills = parseNumericValue(player.unitsKilled);
        const deaths = parseNumericValue(player.unitsDead);
        const victories = parseNumericValue(player.victories);
        const defeats = parseNumericValue(player.defeats);
        
        const kdRatio = deaths > 0 ? kills / deaths : kills > 0 ? kills : 0;
        const totalBattles = victories + defeats;
        const winRate = totalBattles > 0 ? (victories / totalBattles) * 100 : 0;
        
        const issues: string[] = [];
        let severity: 'warning' | 'critical' = 'warning';
        
        if (kdRatio < 10) {
          issues.push(`Low K/D ratio: ${kdRatio.toFixed(2)}`);
          if (kdRatio < 5) severity = 'critical';
        }
        
        if (winRate < 60 && totalBattles > 10) {
          issues.push(`Low win rate: ${winRate.toFixed(1)}%`);
          if (winRate < 40) severity = 'critical';
        }
        
        return issues.length > 0 ? {
          playerId: player.playerId,
          name: player.name,
          winRate,
          kdRatio,
          severity,
          issues
        } : null;
      })
      .filter(alert => alert !== null);
  };

  return {
    plac: analyzePerformance(placPlayers),
    flas: analyzePerformance(flasPlayers)
  };
}