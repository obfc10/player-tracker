/**
 * Player Analytics Service
 * Handles complex player data calculations and analysis
 * Extracted from API routes to improve separation of concerns
 */

import { BaseService } from './BaseService';
import { PlayerRepository } from '@/repositories/PlayerRepository';
import { getConfig } from '@/lib/config';

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
  private config = getConfig('playerTracking');

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
}