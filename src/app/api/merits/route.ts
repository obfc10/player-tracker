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
    const allianceFilter = searchParams.get('alliance') || 'all';

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

    // Add alliance filter if specified
    if (allianceFilter !== 'all') {
      whereClause.allianceTag = allianceFilter;
    }

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

    // Get all players for kingdom-wide calculations (regardless of alliance filter)
    const allCurrentPlayers = await prisma.playerSnapshot.findMany({
      where: { snapshotId: latestSnapshot.id },
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
    const calculatePlayerMetrics = (snapshot: any, allPlayers: any[]) => {
      const merits = parseInt(snapshot.merits || '0');
      const power = parseInt(snapshot.currentPower || '0');
      const kills = parseInt(snapshot.unitsKilled || '0');
      const victories = parseInt(snapshot.victories || '0');
      const defeats = parseInt(snapshot.defeats || '0');
      const totalBattles = victories + defeats;
      
      // Sort all players by merits for percentile calculations
      const allMerits = allPlayers.map(p => parseInt(p.merits || '0')).sort((a, b) => b - a);
      const playerRank = allMerits.findIndex(m => m <= merits) + 1;
      const percentile = allPlayers.length > 0 ? ((allPlayers.length - playerRank + 1) / allPlayers.length) * 100 : 0;
      
      // Merit density by power tier
      const powerTier = power < 1000000 ? 'Under 1M' : 
                       power < 10000000 ? '1M-10M' : 
                       power < 50000000 ? '10M-50M' : 
                       power < 100000000 ? '50M-100M' : 'Over 100M';
      
      // Calculate alliance merit distribution if in alliance
      let allianceMeritShare = 0;
      if (snapshot.allianceTag) {
        const allianceMembers = allPlayers.filter(p => p.allianceTag === snapshot.allianceTag);
        const allianceTotalMerits = allianceMembers.reduce((sum, p) => sum + parseInt(p.merits || '0'), 0);
        allianceMeritShare = allianceTotalMerits > 0 ? (merits / allianceTotalMerits) * 100 : 0;
      }
      
      // Merit gaps to next milestone
      const nextMilestone = merits < 1000000 ? 1000000 :
                           merits < 5000000 ? 5000000 :
                           merits < 10000000 ? 10000000 :
                           merits < 25000000 ? 25000000 :
                           merits < 50000000 ? 50000000 :
                           merits < 100000000 ? 100000000 : merits + 50000000;
      const meritGap = nextMilestone - merits;
      
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
        victories: snapshot.victories,
        defeats: snapshot.defeats,
        
        // Core metrics
        rawMerits: merits,
        rawPower: power,
        rawKills: kills,
        
        // Advanced analytics
        meritPowerRatio: power > 0 ? Math.min((merits / power) * 100, 999999) : 0,
        meritDensity: power > 0 ? merits / (power / 1000000) : 0, // Merits per million power
        meritROI: power > 0 ? (merits / power) * 1000000 : 0, // Merit return per million power invested
        meritPercentile: Math.round(percentile * 10) / 10,
        kingdomRank: playerRank,
        powerTier: powerTier,
        allianceMeritShare: Math.round(allianceMeritShare * 100) / 100,
        meritGap: meritGap,
        nextMilestone: nextMilestone,
        battleEfficiency: totalBattles > 0 ? merits / totalBattles : 0,
        winRate: totalBattles > 0 ? (victories / totalBattles) * 100 : 0
      };
    };

    const playersWithMetrics = currentPlayers.map(snapshot => 
      calculatePlayerMetrics(snapshot, allCurrentPlayers)
    );

    // Enhanced growth calculations with velocity, acceleration, and consistency
    let playersWithGrowth = playersWithMetrics;
    if (compareSnapshot) {
      // Get multiple historical snapshots for advanced metrics
      const allHistoricalSnapshots = await prisma.snapshot.findMany({
        where: {
          ...snapshotFilter,
          timestamp: { lte: latestSnapshot.timestamp }
        },
        orderBy: { timestamp: 'desc' },
        take: 30 // Last 30 snapshots for trend analysis
      });

      // Get player data for all historical snapshots
      const historicalData = new Map();
      for (const snapshot of allHistoricalSnapshots) {
        const players = await prisma.playerSnapshot.findMany({
          where: { snapshotId: snapshot.id },
          select: {
            playerId: true,
            merits: true,
            currentPower: true
          }
        });
        
        players.forEach(player => {
          if (!historicalData.has(player.playerId)) {
            historicalData.set(player.playerId, []);
          }
          historicalData.get(player.playerId).push({
            timestamp: snapshot.timestamp,
            merits: parseInt(player.merits || '0'),
            power: parseInt(player.currentPower || '0')
          });
        });
      }

      const oldPlayers = await prisma.playerSnapshot.findMany({
        where: { snapshotId: compareSnapshot.id },
        select: {
          playerId: true,
          merits: true,
          currentPower: true
        }
      });

      const oldMeritsMap = new Map(
        oldPlayers.map(p => [p.playerId, {
          merits: parseInt(p.merits || '0'),
          power: parseInt(p.currentPower || '0')
        }])
      );

      playersWithGrowth = playersWithMetrics.map(player => {
        const oldData = oldMeritsMap.get(player.playerId) || { merits: 0, power: 0 };
        const growth = player.rawMerits - oldData.merits;
        let growthPercent = oldData.merits > 0 ? (growth / oldData.merits) * 100 : 0;
        
        // Calculate time period in days for velocity
        const timeDiff = (latestSnapshot.timestamp.getTime() - compareSnapshot.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        let meritVelocity = timeDiff > 0 ? growth / timeDiff : 0; // Merits per day
        
        // Get historical data for this player
        const playerHistory = historicalData.get(player.playerId) || [];
        
        // Calculate merit acceleration (change in velocity)
        let meritAcceleration = 0;
        let consistencyScore = 0;
        let momentumScore = 0;
        
        if (playerHistory.length >= 3) {
          // Calculate daily merit gains for consistency scoring
          const dailyGains = [];
          for (let i = 1; i < playerHistory.length; i++) {
            const daysDiff = (playerHistory[i-1].timestamp.getTime() - playerHistory[i].timestamp.getTime()) / (1000 * 60 * 60 * 24);
            if (daysDiff > 0) {
              const dailyGain = (playerHistory[i-1].merits - playerHistory[i].merits) / daysDiff;
              dailyGains.push(dailyGain);
            }
          }
          
          if (dailyGains.length > 1) {
            // Consistency: inverse of coefficient of variation
            const avgGain = dailyGains.reduce((sum, gain) => sum + gain, 0) / dailyGains.length;
            const variance = dailyGains.reduce((sum, gain) => sum + Math.pow(gain - avgGain, 2), 0) / dailyGains.length;
            const stdDev = Math.sqrt(variance);
            consistencyScore = avgGain > 0 ? Math.max(0, 100 - (stdDev / avgGain) * 100) : 0;
            
            // Acceleration: change in velocity over time (only if we have enough data points)
            if (dailyGains.length >= 14) {
              const recentGains = dailyGains.slice(0, 7); // Most recent 7 days
              const olderGains = dailyGains.slice(7, 14); // Previous 7 days (not the oldest)
              const recentAvg = recentGains.reduce((sum, gain) => sum + gain, 0) / recentGains.length;
              const olderAvg = olderGains.reduce((sum, gain) => sum + gain, 0) / olderGains.length;
              meritAcceleration = recentAvg - olderAvg;
            }
            
            // Momentum: weighted recent activity (more weight to recent days)
            momentumScore = dailyGains.reduce((score, gain, index) => {
              const weight = Math.pow(0.9, index); // Exponential decay
              return score + (gain * weight);
            }, 0);
          }
        }
        
        // Ensure all values are valid numbers
        if (!isFinite(growthPercent) || isNaN(growthPercent)) growthPercent = 0;
        if (!isFinite(meritVelocity) || isNaN(meritVelocity)) meritVelocity = 0;
        if (!isFinite(meritAcceleration) || isNaN(meritAcceleration)) meritAcceleration = 0;
        if (!isFinite(consistencyScore) || isNaN(consistencyScore)) consistencyScore = 0;
        if (!isFinite(momentumScore) || isNaN(momentumScore)) momentumScore = 0;

        return {
          ...player,
          meritGrowth: growth,
          meritGrowthPercent: growthPercent,
          meritVelocity: Math.round(meritVelocity),
          meritAcceleration: Math.round(meritAcceleration * 100) / 100,
          consistencyScore: Math.round(consistencyScore * 10) / 10,
          momentumScore: Math.round(momentumScore),
          powerGrowth: player.rawPower - oldData.power,
          historicalDataPoints: playerHistory.length
        };
      });
    }

    // Get available alliances for filter
    const availableAlliances = [...new Set(allCurrentPlayers
      .map(p => p.allianceTag)
      .filter(tag => tag !== null)
    )].sort();

    // Sort and get top players for each category
    const topMerits = [...playersWithGrowth]
      .sort((a, b) => b.rawMerits - a.rawMerits)
      .slice(0, 50);

    const topEfficiency = [...playersWithGrowth]
      .filter(p => p.rawPower >= 1000000) // Only include players with 1M+ power for efficiency
      .sort((a, b) => b.meritPowerRatio - a.meritPowerRatio)
      .slice(0, 50);


    const topDensity = [...playersWithGrowth]
      .filter(p => p.rawPower >= 1000000)
      .sort((a, b) => b.meritDensity - a.meritDensity)
      .slice(0, 50);

    const topROI = [...playersWithGrowth]
      .filter(p => p.rawPower >= 1000000)
      .sort((a, b) => b.meritROI - a.meritROI)
      .slice(0, 50);

    const topPercentile = [...playersWithGrowth]
      .sort((a, b) => b.meritPercentile - a.meritPercentile)
      .slice(0, 50);

    const topGrowth = timeframe !== 'current' ? [...playersWithGrowth]
      .filter(p => (p as any).meritGrowth !== undefined && (p as any).meritGrowth > 0)
      .sort((a, b) => ((b as any).meritGrowth || 0) - ((a as any).meritGrowth || 0))
      .slice(0, 50) : [];

    const topVelocity = timeframe !== 'current' ? [...playersWithGrowth]
      .filter(p => (p as any).meritVelocity !== undefined && (p as any).meritVelocity > 0)
      .sort((a, b) => ((b as any).meritVelocity || 0) - ((a as any).meritVelocity || 0))
      .slice(0, 50) : [];

    const topAcceleration = timeframe !== 'current' ? [...playersWithGrowth]
      .filter(p => (p as any).meritAcceleration !== undefined)
      .sort((a, b) => ((b as any).meritAcceleration || 0) - ((a as any).meritAcceleration || 0))
      .slice(0, 50) : [];

    const topConsistency = timeframe !== 'current' ? [...playersWithGrowth]
      .filter(p => (p as any).consistencyScore !== undefined && (p as any).consistencyScore > 0)
      .sort((a, b) => ((b as any).consistencyScore || 0) - ((a as any).consistencyScore || 0))
      .slice(0, 50) : [];

    const topMomentum = timeframe !== 'current' ? [...playersWithGrowth]
      .filter(p => (p as any).momentumScore !== undefined && (p as any).momentumScore > 0)
      .sort((a, b) => ((b as any).momentumScore || 0) - ((a as any).momentumScore || 0))
      .slice(0, 50) : [];

    // Alliance merit distribution analysis
    const allianceDistribution = new Map();
    playersWithGrowth.forEach(player => {
      if (player.allianceTag) {
        if (!allianceDistribution.has(player.allianceTag)) {
          allianceDistribution.set(player.allianceTag, []);
        }
        allianceDistribution.get(player.allianceTag).push(player);
      }
    });

    const allianceAnalysis = Array.from(allianceDistribution.entries()).map(([tag, members]) => {
      const totalMerits = members.reduce((sum: number, m: any) => sum + m.rawMerits, 0);
      const avgMerits = totalMerits / members.length;
      const topContributor = members.reduce((top: any, member: any) => 
        member.rawMerits > top.rawMerits ? member : top
      );
      
      return {
        allianceTag: tag,
        memberCount: members.length,
        totalMerits,
        averageMerits: Math.round(avgMerits),
        topContributor: {
          name: topContributor.currentName || topContributor.name,
          merits: topContributor.rawMerits,
          share: (topContributor.rawMerits / totalMerits) * 100
        },
        members: members.map((m: any) => ({
          name: m.currentName || m.name,
          merits: m.rawMerits,
          share: m.allianceMeritShare,
          percentile: m.meritPercentile
        })).sort((a: any, b: any) => b.merits - a.merits)
      };
    }).sort((a: any, b: any) => b.totalMerits - a.totalMerits);

    // Calculate kingdom statistics
    const totalMerits = playersWithMetrics.reduce((sum, p) => sum + p.rawMerits, 0);
    const averageMerits = playersWithMetrics.length > 0 ? totalMerits / playersWithMetrics.length : 0;
    const validEfficiencyPlayers = playersWithMetrics.filter(p => p.rawPower >= 1000000);
    const averageEfficiency = validEfficiencyPlayers.length > 0 
      ? validEfficiencyPlayers.reduce((sum, p) => sum + p.meritPowerRatio, 0) / validEfficiencyPlayers.length 
      : 0;


    return NextResponse.json({
      // Core categories
      topMerits,
      topEfficiency,
      topGrowth,
      
      // Advanced analytics
      topDensity,
      topROI,
      topPercentile,
      topVelocity,
      topAcceleration,
      topConsistency,
      topMomentum,
      
      // Alliance analysis
      allianceAnalysis,
      availableAlliances,
      selectedAlliance: allianceFilter,
      
      // Kingdom statistics
      kingdomStats: {
        totalMerits: totalMerits.toString(),
        averageMerits: Math.round(averageMerits),
        averageEfficiency: averageEfficiency,
        totalPlayers: playersWithMetrics.length,
        filteredPlayers: playersWithGrowth.length,
        totalAlliances: availableAlliances.length,
        averageMeritDensity: playersWithMetrics.filter(p => p.rawPower >= 1000000).length > 0 
          ? playersWithMetrics.filter(p => p.rawPower >= 1000000).reduce((sum, p) => sum + p.meritDensity, 0) / playersWithMetrics.filter(p => p.rawPower >= 1000000).length 
          : 0
      },
      
      // Meta information
      timeframe: timeframe === 'current' ? `Current (${latestSnapshot?.timestamp?.toISOString().split('T')[0] || 'Unknown'})` 
        : timeframe === 'week' ? 'Past 7 Days' 
        : 'Past 30 Days',
      snapshotInfo: {
        current: latestSnapshot?.timestamp?.toISOString(),
        compare: compareSnapshot?.timestamp?.toISOString() || null,
        totalSnapshots: compareSnapshot ? 2 : 1
      }
    });

  } catch (error) {
    console.error('Error fetching merit data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch merit analytics' },
      { status: 500 }
    );
  }
}