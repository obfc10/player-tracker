/**
 * Player Analytics Service
 * Handles complex player data calculations and analysis
 * Extracted from API routes to improve separation of concerns
 */

import { BaseService } from './BaseService';
import { PlayerRepository } from '@/repositories/PlayerRepository';
import { getFeaturesConfiguration } from '@/config';
import { formatNumber, formatPercentage } from '@/lib/formatting';
import { getManagedAllianceByTag } from '@/lib/alliance-config';
import { prisma } from '@/lib/db';

// Alliance Analytics Interfaces
export interface AllianceHealthMetrics {
  combinedPower: number;
  powerDistribution: Array<{
    alliance: string;
    power: number;
    percentage: number;
  }>;
  memberCount: {
    total: number;
    byAlliance: Array<{
      alliance: string;
      count: number;
    }>;
  };
  activityScore: {
    percentage: number;
    activeCount: number;
    totalCount: number;
  };
  inactivePlayers: Array<{
    playerId: string;
    name: string;
    alliance: string;
    currentPower: number;
    powerGrowth: number;
    lastActive: Date;
    daysSinceActive: number;
  }>;
}

export interface PlayerEfficiencyMetrics {
  playerId: string;
  name: string;
  alliance: string;
  killDeathRatio: number;
  winRate: number;
  meritEfficiency: number; // merits per million power
  powerEfficiency: number; // kills per million power
  flagged: boolean;
  flagReasons: string[];
}

export interface PowerDistributionBracket {
  bracket: string;
  range: {
    min: number;
    max: number | null;
  };
  count: number;
  percentage: number;
  players: Array<{
    playerId: string;
    name: string;
    power: number;
  }>;
}

export interface PowerDistributionMetrics {
  brackets: PowerDistributionBracket[];
  bottom10Percent: Array<{
    playerId: string;
    name: string;
    alliance: string;
    power: number;
  }>;
  powerComposition: {
    building: number;
    hero: number;
    legion: number;
    tech: number;
    buildingPercentage: number;
    heroPercentage: number;
    legionPercentage: number;
    techPercentage: number;
  };
}

export interface InactiveMember {
  playerId: string;
  name: string;
  alliance: string;
  currentPower: number;
  previousPower: number;
  powerGrowth: number;
  merits: number;
  meritGrowth: number;
  killsGrowth: number;
  severityLevel: 'low' | 'medium' | 'high' | 'critical';
  inactivityReasons: string[];
  daysSinceLastSnapshot: number;
}

export interface PlayerStats {
  powerGrowthRate: number;
  combatEfficiency: string | number;
  activityLevel: number;
  resourceEfficiency: string;
  killDeathRatio: string | number;
  totalKills: number;
  totalDeaths: number;
  averageDailyGrowth: number;
  daysTracked: number;
  powerBreakdown: {
    building: number;
    hero: number;
    legion: number;
    tech: number;
  };
  killBreakdown: {
    t1: number;
    t2: number;
    t3: number;
    t4: number;
    t5: number;
  };
}

export interface PlayerChartData {
  powerTrend: Array<{ date: string; power: number }>;
  combatTrend: Array<{ date: string; kills: number; deaths: number }>;
  resourceTrend: Array<{ date: string; gold: number; wood: number; ore: number; mana: number; gems: number }>;
  activityTrend: Array<{ date: string; helps: number; sieges: number; scouted: number }>;
}

export interface PlayerAnalysisResult {
  player: {
    lordId: string;
    currentName: string;
    nameHistory?: any[];
    allianceHistory?: any[];
    createdAt: Date;
    updatedAt: Date;
  };
  latestSnapshot: any | null;
  stats: PlayerStats;
  chartData: PlayerChartData;
  snapshotCount: number;
}

export class PlayerAnalyticsService extends BaseService {
  private playerRepository: PlayerRepository;
  private config = getFeaturesConfiguration().playerTracking;

  constructor() {
    super();
    this.playerRepository = new PlayerRepository();
  }

  /**
   * Get comprehensive player analysis including stats and chart data
   */
  async getPlayerAnalysis(lordId: string): Promise<PlayerAnalysisResult> {
    this.validateRequired({ lordId }, ['lordId']);

    return this.executeDbOperation(
      async () => {
        // Fetch player with all related data
        const player = await this.playerRepository.findByLordIdWithHistory(lordId);
        
        if (!player) {
          throw new Error(`Player with ID ${lordId} not found`);
        }

        // Calculate statistics
        const latestSnapshot = player.snapshots?.[0];
        const stats = this.calculatePlayerStats(player.snapshots || []);
        const chartData = this.prepareChartData(player.snapshots || []);

        return {
          player: {
            lordId: player.lordId,
            currentName: player.currentName,
            nameHistory: player.nameHistory,
            allianceHistory: player.allianceHistory,
            createdAt: player.createdAt,
            updatedAt: player.updatedAt
          },
          latestSnapshot: latestSnapshot ? this.formatSnapshotForDisplay(latestSnapshot) : null,
          stats,
          chartData,
          snapshotCount: player.snapshots?.length || 0
        };
      },
      'getPlayerAnalysis',
      { lordId }
    );
  }

  /**
   * Calculate comprehensive player statistics
   */
  private calculatePlayerStats(snapshots: any[]): PlayerStats {
    if (snapshots.length < 2) {
      return this.getEmptyStats();
    }

    const latest = snapshots[0];
    const oldest = snapshots[snapshots.length - 1];
    
    const daysDiff = Math.max(1, 
      (new Date(latest.snapshot.timestamp).getTime() - 
       new Date(oldest.snapshot.timestamp).getTime()) / (1000 * 60 * 60 * 24)
    );

    const currentPower = this.parseNumericValue(latest.currentPower);
    const oldPower = this.parseNumericValue(oldest.currentPower);
    const powerGrowth = currentPower - oldPower;
    
    const unitsKilled = this.parseNumericValue(latest.unitsKilled);
    const unitsDead = this.parseNumericValue(latest.unitsDead);

    return {
      powerGrowthRate: Math.round(powerGrowth / daysDiff),
      combatEfficiency: unitsDead > 0 ? (unitsKilled / unitsDead).toFixed(2) : 'N/A',
      activityLevel: Math.round(latest.helpsGiven / daysDiff),
      resourceEfficiency: this.calculateResourceEfficiency(latest),
      killDeathRatio: unitsDead > 0 ? (unitsKilled / unitsDead).toFixed(2) : 'N/A',
      totalKills: unitsKilled,
      totalDeaths: unitsDead,
      averageDailyGrowth: Math.round(powerGrowth / daysDiff),
      daysTracked: Math.round(daysDiff),
      powerBreakdown: {
        building: this.parseNumericValue(latest.buildingPower),
        hero: this.parseNumericValue(latest.heroPower),
        legion: this.parseNumericValue(latest.legionPower),
        tech: this.parseNumericValue(latest.techPower)
      },
      killBreakdown: {
        t1: this.parseNumericValue(latest.t1KillCount),
        t2: this.parseNumericValue(latest.t2KillCount),
        t3: this.parseNumericValue(latest.t3KillCount),
        t4: this.parseNumericValue(latest.t4KillCount),
        t5: this.parseNumericValue(latest.t5KillCount)
      }
    };
  }

  /**
   * Calculate resource efficiency percentage
   */
  private calculateResourceEfficiency(snapshot: any): string {
    const totalSpent = 
      this.parseNumericValue(snapshot.goldSpent) + 
      this.parseNumericValue(snapshot.woodSpent) + 
      this.parseNumericValue(snapshot.oreSpent) + 
      this.parseNumericValue(snapshot.manaSpent) + 
      this.parseNumericValue(snapshot.gemsSpent);
    
    const totalCurrent = 
      this.parseNumericValue(snapshot.gold) + 
      this.parseNumericValue(snapshot.wood) + 
      this.parseNumericValue(snapshot.ore) + 
      this.parseNumericValue(snapshot.mana) + 
      this.parseNumericValue(snapshot.gems);
    
    return totalSpent > 0 ? ((totalCurrent / totalSpent) * 100).toFixed(1) : '0';
  }

  /**
   * Prepare chart data for visualization
   */
  private prepareChartData(snapshots: any[]): PlayerChartData {
    // Prepare data for charts - reverse to show chronological order
    const reversed = [...snapshots].reverse();
    
    return {
      powerTrend: reversed.map((s: any) => ({
        date: new Date(s.snapshot.timestamp).toLocaleDateString(),
        power: this.parseNumericValue(s.currentPower)
      })),
      combatTrend: reversed.map((s: any) => ({
        date: new Date(s.snapshot.timestamp).toLocaleDateString(),
        kills: this.parseNumericValue(s.unitsKilled),
        deaths: this.parseNumericValue(s.unitsDead)
      })),
      resourceTrend: reversed.map((s: any) => ({
        date: new Date(s.snapshot.timestamp).toLocaleDateString(),
        gold: this.parseNumericValue(s.gold),
        wood: this.parseNumericValue(s.wood),
        ore: this.parseNumericValue(s.ore),
        mana: this.parseNumericValue(s.mana),
        gems: this.parseNumericValue(s.gems)
      })),
      activityTrend: reversed.map((s: any) => ({
        date: new Date(s.snapshot.timestamp).toLocaleDateString(),
        helps: s.helpsGiven,
        sieges: s.citySieges,
        scouted: s.scouted
      }))
    };
  }

  /**
   * Format snapshot data for display
   */
  private formatSnapshotForDisplay(snapshot: any): any {
    return {
      ...snapshot,
      // Convert string numbers back for display
      currentPower: this.parseNumericValue(snapshot.currentPower),
      power: this.parseNumericValue(snapshot.power),
      unitsKilled: this.parseNumericValue(snapshot.unitsKilled),
      unitsDead: this.parseNumericValue(snapshot.unitsDead),
      merits: this.parseNumericValue(snapshot.merits)
    };
  }

  /**
   * Get empty stats structure for players with insufficient data
   */
  private getEmptyStats(): PlayerStats {
    return {
      powerGrowthRate: 0,
      combatEfficiency: 0,
      activityLevel: 0,
      resourceEfficiency: '0',
      killDeathRatio: 0,
      totalKills: 0,
      totalDeaths: 0,
      averageDailyGrowth: 0,
      daysTracked: 0,
      powerBreakdown: {
        building: 0,
        hero: 0,
        legion: 0,
        tech: 0
      },
      killBreakdown: {
        t1: 0,
        t2: 0,
        t3: 0,
        t4: 0,
        t5: 0
      }
    };
  }

  /**
   * Safely parse numeric values from string or number
   */
  private parseNumericValue(value: string | number | null | undefined): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseInt(value.replace(/,/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Get player comparison data for multiple players
   */
  async getPlayerComparison(lordIds: string[]): Promise<Array<{ lordId: string; stats: PlayerStats }>> {
    this.validateRequired({ lordIds }, ['lordIds']);

    if (lordIds.length === 0) {
      return [];
    }

    return this.executeDbOperation(
      async () => {
        const comparisons = [];
        
        for (const lordId of lordIds) {
          try {
            const player = await this.playerRepository.findByLordIdWithHistory(lordId);
            if (player && player.snapshots) {
              const stats = this.calculatePlayerStats(player.snapshots);
              comparisons.push({ lordId, stats });
            }
          } catch (error) {
            this.logWarning('getPlayerComparison', `Failed to get stats for player ${lordId}`, error);
          }
        }
        
        return comparisons;
      },
      'getPlayerComparison',
      { playerCount: lordIds.length }
    );
  }

  /**
   * Get alliance health metrics for specified alliances
   */
  async getAllianceHealthMetrics(
    allianceTags: string[],
    snapshotIds: string[]
  ): Promise<AllianceHealthMetrics> {
    this.validateRequired({ allianceTags, snapshotIds }, ['allianceTags', 'snapshotIds']);

    return this.executeDbOperation(
      async () => {
        // Get all player snapshots for the specified alliances and snapshots
        const snapshots = await prisma.playerSnapshot.findMany({
          where: {
            snapshotId: { in: snapshotIds },
            allianceTag: { in: allianceTags }
          },
          include: {
            player: true,
            snapshot: true
          },
          orderBy: {
            snapshot: {
              timestamp: 'desc'
            }
          }
        });

        // Group snapshots by player to get latest data
        const latestSnapshots = new Map<string, any>();
        const previousSnapshots = new Map<string, any>();
        
        snapshots.forEach(snapshot => {
          const playerId = snapshot.playerId;
          if (!latestSnapshots.has(playerId)) {
            latestSnapshots.set(playerId, snapshot);
          } else if (!previousSnapshots.has(playerId)) {
            previousSnapshots.set(playerId, snapshot);
          }
        });

        // Calculate combined power and distribution
        let combinedPower = 0;
        const powerByAlliance = new Map<string, number>();
        const membersByAlliance = new Map<string, number>();
        const inactivePlayers: AllianceHealthMetrics['inactivePlayers'] = [];

        latestSnapshots.forEach((snapshot, playerId) => {
          const power = this.parseNumericValue(snapshot.currentPower);
          const alliance = snapshot.allianceTag || 'Unknown';
          
          combinedPower += power;
          powerByAlliance.set(alliance, (powerByAlliance.get(alliance) || 0) + power);
          membersByAlliance.set(alliance, (membersByAlliance.get(alliance) || 0) + 1);

          // Check for activity (power growth in last 48h)
          const previousSnapshot = previousSnapshots.get(playerId);
          if (previousSnapshot) {
            const previousPower = this.parseNumericValue(previousSnapshot.currentPower);
            const powerGrowth = power - previousPower;
            const timeDiff = new Date(snapshot.snapshot.timestamp).getTime() -
                            new Date(previousSnapshot.snapshot.timestamp).getTime();
            const daysSinceActive = timeDiff / (1000 * 60 * 60 * 24);

            if (powerGrowth <= 0 && daysSinceActive <= 2) {
              inactivePlayers.push({
                playerId: snapshot.playerId,
                name: snapshot.name,
                alliance,
                currentPower: power,
                powerGrowth,
                lastActive: previousSnapshot.snapshot.timestamp,
                daysSinceActive: Math.round(daysSinceActive)
              });
            }
          }
        });

        // Calculate power distribution percentages
        const powerDistribution = Array.from(powerByAlliance.entries()).map(([alliance, power]) => ({
          alliance,
          power,
          percentage: (power / combinedPower) * 100
        }));

        // Calculate member counts
        const memberCount = {
          total: latestSnapshots.size,
          byAlliance: Array.from(membersByAlliance.entries()).map(([alliance, count]) => ({
            alliance,
            count
          }))
        };

        // Calculate activity score
        const activeCount = latestSnapshots.size - inactivePlayers.length;
        const activityScore = {
          percentage: (activeCount / latestSnapshots.size) * 100,
          activeCount,
          totalCount: latestSnapshots.size
        };

        return {
          combinedPower,
          powerDistribution,
          memberCount,
          activityScore,
          inactivePlayers
        };
      },
      'getAllianceHealthMetrics',
      { allianceCount: allianceTags.length, snapshotCount: snapshotIds.length }
    );
  }

  /**
   * Get player efficiency metrics for a snapshot
   */
  async getPlayerEfficiencyMetrics(snapshotId: string): Promise<PlayerEfficiencyMetrics[]> {
    this.validateRequired({ snapshotId }, ['snapshotId']);

    return this.executeDbOperation(
      async () => {
        const snapshots = await prisma.playerSnapshot.findMany({
          where: { snapshotId },
          include: { player: true }
        });

        return snapshots.map(snapshot => {
          const power = this.parseNumericValue(snapshot.currentPower);
          const kills = this.parseNumericValue(snapshot.unitsKilled);
          const deaths = this.parseNumericValue(snapshot.unitsDead);
          const victories = this.parseNumericValue(snapshot.victories);
          const defeats = this.parseNumericValue(snapshot.defeats);
          const merits = this.parseNumericValue(snapshot.merits);

          // Calculate K/D ratio (handle division by zero)
          const killDeathRatio = deaths > 0 ? kills / deaths : kills > 0 ? kills : 0;
          
          // Calculate win rate
          const totalBattles = victories + defeats;
          const winRate = totalBattles > 0 ? (victories / totalBattles) * 100 : 0;
          
          // Calculate merit efficiency (merits per million power)
          const meritEfficiency = power > 0 ? (merits / (power / 1000000)) : 0;
          
          // Calculate power efficiency (kills per million power)
          const powerEfficiency = power > 0 ? (kills / (power / 1000000)) : 0;

          // Flag players with poor performance
          const flagReasons: string[] = [];
          if (killDeathRatio < 10) {
            flagReasons.push(`Low K/D ratio: ${killDeathRatio.toFixed(2)}`);
          }
          if (winRate < 60 && totalBattles > 10) {
            flagReasons.push(`Low win rate: ${winRate.toFixed(1)}%`);
          }

          return {
            playerId: snapshot.playerId,
            name: snapshot.name,
            alliance: snapshot.allianceTag || 'None',
            killDeathRatio,
            winRate,
            meritEfficiency,
            powerEfficiency,
            flagged: flagReasons.length > 0,
            flagReasons
          };
        });
      },
      'getPlayerEfficiencyMetrics',
      { snapshotId }
    );
  }

  /**
   * Get power distribution metrics for alliances
   */
  async getPowerDistribution(
    allianceTags: string[],
    snapshotId: string
  ): Promise<PowerDistributionMetrics> {
    this.validateRequired({ allianceTags, snapshotId }, ['allianceTags', 'snapshotId']);

    return this.executeDbOperation(
      async () => {
        const snapshots = await prisma.playerSnapshot.findMany({
          where: {
            snapshotId,
            allianceTag: { in: allianceTags }
          },
          include: { player: true }
        });

        // Define power brackets
        const brackets = [
          { bracket: '<5M', range: { min: 0, max: 5000000 } },
          { bracket: '5-10M', range: { min: 5000000, max: 10000000 } },
          { bracket: '10-20M', range: { min: 10000000, max: 20000000 } },
          { bracket: '20-50M', range: { min: 20000000, max: 50000000 } },
          { bracket: '>50M', range: { min: 50000000, max: null } }
        ];

        // Categorize players into brackets
        const bracketData: PowerDistributionBracket[] = brackets.map(b => ({
          ...b,
          count: 0,
          percentage: 0,
          players: []
        }));

        const allPlayers: Array<{ playerId: string; name: string; alliance: string; power: number }> = [];
        let totalBuildingPower = 0;
        let totalHeroPower = 0;
        let totalLegionPower = 0;
        let totalTechPower = 0;

        snapshots.forEach(snapshot => {
          const power = this.parseNumericValue(snapshot.currentPower);
          const playerData = {
            playerId: snapshot.playerId,
            name: snapshot.name,
            alliance: snapshot.allianceTag || 'None',
            power
          };
          
          allPlayers.push(playerData);

          // Add to appropriate bracket
          for (const bracket of bracketData) {
            if (bracket.range.max === null && power >= bracket.range.min) {
              bracket.count++;
              bracket.players.push({ playerId: playerData.playerId, name: playerData.name, power });
              break;
            } else if (bracket.range.max !== null && power >= bracket.range.min && power < bracket.range.max) {
              bracket.count++;
              bracket.players.push({ playerId: playerData.playerId, name: playerData.name, power });
              break;
            }
          }

          // Accumulate power composition
          totalBuildingPower += this.parseNumericValue(snapshot.buildingPower);
          totalHeroPower += this.parseNumericValue(snapshot.heroPower);
          totalLegionPower += this.parseNumericValue(snapshot.legionPower);
          totalTechPower += this.parseNumericValue(snapshot.techPower);
        });

        // Calculate percentages for brackets
        const totalPlayers = allPlayers.length;
        bracketData.forEach(bracket => {
          bracket.percentage = totalPlayers > 0 ? (bracket.count / totalPlayers) * 100 : 0;
        });

        // Sort players by power to find bottom 10%
        allPlayers.sort((a, b) => a.power - b.power);
        const bottom10Count = Math.ceil(totalPlayers * 0.1);
        const bottom10Percent = allPlayers.slice(0, bottom10Count);

        // Calculate power composition percentages
        const totalCompositionPower = totalBuildingPower + totalHeroPower + totalLegionPower + totalTechPower;
        const powerComposition = {
          building: totalBuildingPower,
          hero: totalHeroPower,
          legion: totalLegionPower,
          tech: totalTechPower,
          buildingPercentage: totalCompositionPower > 0 ? (totalBuildingPower / totalCompositionPower) * 100 : 0,
          heroPercentage: totalCompositionPower > 0 ? (totalHeroPower / totalCompositionPower) * 100 : 0,
          legionPercentage: totalCompositionPower > 0 ? (totalLegionPower / totalCompositionPower) * 100 : 0,
          techPercentage: totalCompositionPower > 0 ? (totalTechPower / totalCompositionPower) * 100 : 0
        };

        return {
          brackets: bracketData,
          bottom10Percent,
          powerComposition
        };
      },
      'getPowerDistribution',
      { allianceCount: allianceTags.length, snapshotId }
    );
  }

  /**
   * Detect inactive members by comparing snapshots
   */
  async detectInactiveMembers(
    currentSnapshotId: string,
    previousSnapshotId: string
  ): Promise<InactiveMember[]> {
    this.validateRequired({ currentSnapshotId, previousSnapshotId }, ['currentSnapshotId', 'previousSnapshotId']);

    return this.executeDbOperation(
      async () => {
        // Get current and previous snapshots
        const [currentSnapshots, previousSnapshots] = await Promise.all([
          prisma.playerSnapshot.findMany({
            where: { snapshotId: currentSnapshotId },
            include: { player: true, snapshot: true }
          }),
          prisma.playerSnapshot.findMany({
            where: { snapshotId: previousSnapshotId },
            include: { player: true, snapshot: true }
          })
        ]);

        // Create maps for easy lookup
        const previousMap = new Map(
          previousSnapshots.map(s => [s.playerId, s])
        );

        const inactiveMembers: InactiveMember[] = [];

        currentSnapshots.forEach(current => {
          const previous = previousMap.get(current.playerId);
          if (!previous) return; // Skip if no previous data

          const currentPower = this.parseNumericValue(current.currentPower);
          const previousPower = this.parseNumericValue(previous.currentPower);
          const powerGrowth = currentPower - previousPower;

          const currentMerits = this.parseNumericValue(current.merits);
          const previousMerits = this.parseNumericValue(previous.merits);
          const meritGrowth = currentMerits - previousMerits;

          const currentKills = this.parseNumericValue(current.unitsKilled);
          const previousKills = this.parseNumericValue(previous.unitsKilled);
          const killsGrowth = currentKills - previousKills;

          const timeDiff = new Date(current.snapshot.timestamp).getTime() -
                          new Date(previous.snapshot.timestamp).getTime();
          const daysSinceLastSnapshot = timeDiff / (1000 * 60 * 60 * 24);

          const inactivityReasons: string[] = [];
          let severityLevel: InactiveMember['severityLevel'] = 'low';

          // Check for inactivity indicators
          if (powerGrowth <= 0) {
            inactivityReasons.push('No power growth');
            severityLevel = 'medium';
          }

          if (meritGrowth < 10000) {
            inactivityReasons.push(`Low merit accumulation: ${formatNumber(meritGrowth)}`);
            if (meritGrowth < 1000) {
              severityLevel = severityLevel === 'medium' ? 'high' : 'medium';
            }
          }

          if (killsGrowth < 10000) {
            inactivityReasons.push(`Low combat activity: ${formatNumber(killsGrowth)} kills`);
            if (killsGrowth === 0) {
              severityLevel = severityLevel === 'high' ? 'critical' :
                             severityLevel === 'medium' ? 'high' : 'medium';
            }
          }

          // Only add if there are inactivity indicators
          if (inactivityReasons.length > 0) {
            inactiveMembers.push({
              playerId: current.playerId,
              name: current.name,
              alliance: current.allianceTag || 'None',
              currentPower,
              previousPower,
              powerGrowth,
              merits: currentMerits,
              meritGrowth,
              killsGrowth,
              severityLevel,
              inactivityReasons,
              daysSinceLastSnapshot: Math.round(daysSinceLastSnapshot)
            });
          }
        });

        // Sort by severity level (critical first)
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        inactiveMembers.sort((a, b) =>
          severityOrder[a.severityLevel] - severityOrder[b.severityLevel]
        );

        return inactiveMembers;
      },
      'detectInactiveMembers',
      { currentSnapshotId, previousSnapshotId }
    );
  }
}