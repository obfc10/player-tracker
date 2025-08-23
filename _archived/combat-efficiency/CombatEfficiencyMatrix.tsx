'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  Target,
  Shield,
  TrendingUp,
  Zap,
  ArrowUpDown,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react';
import { formatNumber, formatPercentage, formatBattleEfficiency } from '@/lib/formatting';
import { isManagedAlliance, getManagedAllianceColor, ALLIANCE_FILTER_OPTIONS } from '@/lib/alliance-config';
import { PlayerData, LeaderboardPlayer } from '@/types/player';

interface CombatMetrics {
  unitsKilled: number;
  killDeathRatio: number;
  unitsHealed: number;
  winRate: number;
}

interface CombatEfficiencyData extends LeaderboardPlayer {
  metrics: CombatMetrics;
  percentiles: CombatMetrics;
  isTopPerformer: boolean;
}

interface CombatEfficiencyMatrixProps {
  snapshotId?: string;
  allianceTags?: string[];
  minPower?: number;
  sortBy?: keyof CombatMetrics;
  onPlayerClick?: (playerId: string) => void;
}

type SortColumn = keyof CombatMetrics | 'power' | 'name';

const METRIC_CONFIG = {
  unitsKilled: {
    label: 'Units Killed',
    icon: Target,
    formatter: (value: number) => formatNumber(value),
    color: 'text-red-400'
  },
  killDeathRatio: {
    label: 'K/D Ratio',
    icon: Zap,
    formatter: (value: number) => value.toFixed(2),
    color: 'text-orange-400'
  },
  unitsHealed: {
    label: 'Units Healed',
    icon: Shield,
    formatter: (value: number) => formatNumber(value),
    color: 'text-green-400'
  },
  winRate: {
    label: 'Win Rate',
    icon: Trophy,
    formatter: (value: number) => formatPercentage(value),
    color: 'text-yellow-400'
  }
};

export function CombatEfficiencyMatrix({
  snapshotId,
  allianceTags = [],
  minPower = 0,
  sortBy = 'unitsKilled',
  onPlayerClick
}: CombatEfficiencyMatrixProps) {
  const [data, setData] = useState<CombatEfficiencyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<SortColumn>(sortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [allianceFilter, setAllianceFilter] = useState<string>('all');
  const [powerRange, setPowerRange] = useState<[number, number]>([0, 250000000]);
  const [hideInactive, setHideInactive] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [resultLimit, setResultLimit] = useState<number | 'all'>('all');

  // Calculate color intensity based on percentile (0-100)
  const getHeatmapColor = useCallback((percentile: number): string => {
    if (percentile >= 80) return 'bg-green-500/80 text-white'; // Excellent
    if (percentile >= 60) return 'bg-green-400/60 text-white'; // Good
    if (percentile >= 40) return 'bg-yellow-500/60 text-black'; // Average
    if (percentile >= 20) return 'bg-orange-500/60 text-white'; // Below Average
    return 'bg-red-500/60 text-white'; // Poor
  }, []);

  // Process raw player data into combat efficiency metrics
  const processPlayerData = useCallback((players: LeaderboardPlayer[]): CombatEfficiencyData[] => {
    const processedData = players.map(player => {
      const unitsKilled = parseInt(player.unitsKilled || '0');
      const unitsDead = parseInt(player.unitsDead || '0');
      const unitsHealed = parseInt(player.unitsHealed || '0');
      const victories = player.victories || 0;
      const defeats = player.defeats || 0;

      const metrics: CombatMetrics = {
        unitsKilled,
        killDeathRatio: formatBattleEfficiency(unitsKilled, unitsDead),
        unitsHealed,
        winRate: victories + defeats > 0 ? (victories / (victories + defeats)) * 100 : 0
      };

      return {
        ...player,
        metrics,
        percentiles: { ...metrics }, // Will be calculated later
        isTopPerformer: false // Will be calculated later
      } as CombatEfficiencyData;
    });

    // Calculate percentiles for each metric
    Object.keys(METRIC_CONFIG).forEach(metricKey => {
      const metric = metricKey as keyof CombatMetrics;
      const values = processedData.map(p => p.metrics[metric]).sort((a, b) => a - b);
      
      processedData.forEach(player => {
        const value = player.metrics[metric];
        const rank = values.findIndex(v => v >= value);
        // For all metrics, higher values are better, so reverse the percentile calculation
        const percentile = ((values.length - rank) / values.length) * 100;
        player.percentiles[metric] = percentile;
        
        // Mark as top performer if in top 10% for any metric
        if (percentile >= 90) {
          player.isTopPerformer = true;
        }
      });
    });

    return processedData;
  }, []);

  // Fetch player data
  const fetchPlayerData = useCallback(async () => {
    try {
      setLoading(true);
      const url = snapshotId
        ? `/api/data/snapshots?snapshotId=${snapshotId}`
        : '/api/leaderboard';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch player data');
      
      const result = await response.json();
      const players = result.data || result.players || [];
      
      const processedData = processPlayerData(players);
      setData(processedData);
    } catch (error) {
      console.error('Error fetching player data:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [snapshotId, processPlayerData]);

  // Load data on mount
  useEffect(() => {
    fetchPlayerData();
  }, [fetchPlayerData]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = data;

    // Alliance filter
    if (allianceFilter !== 'all') {
      if (allianceFilter === 'managed') {
        filtered = filtered.filter(p => p.allianceTag && isManagedAlliance(p.allianceTag));
      } else if (allianceFilter === 'others') {
        filtered = filtered.filter(p => !p.allianceTag || !isManagedAlliance(p.allianceTag));
      } else {
        filtered = filtered.filter(p => p.allianceTag === allianceFilter);
      }
    }

    // Power range filter
    filtered = filtered.filter(p => {
      const power = parseInt(p.currentPower || '0');
      return power >= powerRange[0] && power <= powerRange[1];
    });

    // Hide inactive filter
    if (hideInactive) {
      filtered = filtered.filter(p => !p.hasLeftRealm);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      if (sortColumn === 'power') {
        aValue = parseInt(a.currentPower || '0');
        bValue = parseInt(b.currentPower || '0');
      } else if (sortColumn === 'name') {
        aValue = a.name || a.currentName || '';
        bValue = b.name || b.currentName || '';
      } else {
        aValue = a.metrics[sortColumn];
        bValue = b.metrics[sortColumn];
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      const numA = typeof aValue === 'number' ? aValue : 0;
      const numB = typeof bValue === 'number' ? bValue : 0;
      
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });

    // Apply result limit
    if (resultLimit !== 'all') {
      filtered = filtered.slice(0, resultLimit);
    }

    return filtered;
  }, [data, allianceFilter, powerRange, hideInactive, sortColumn, sortOrder]);

  // Calculate alliance averages for summary
  const allianceAverages = useMemo(() => {
    const managedPlayers = filteredData.filter(p => p.allianceTag && isManagedAlliance(p.allianceTag));
    if (managedPlayers.length === 0) return null;

    const averages: CombatMetrics = {
      unitsKilled: managedPlayers.reduce((sum, p) => sum + p.metrics.unitsKilled, 0) / managedPlayers.length,
      killDeathRatio: managedPlayers.reduce((sum, p) => sum + p.metrics.killDeathRatio, 0) / managedPlayers.length,
      unitsHealed: managedPlayers.reduce((sum, p) => sum + p.metrics.unitsHealed, 0) / managedPlayers.length,
      winRate: managedPlayers.reduce((sum, p) => sum + p.metrics.winRate, 0) / managedPlayers.length
    };

    return averages;
  }, [filteredData]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('desc');
    }
  };

  const handlePlayerClick = (player: CombatEfficiencyData) => {
    if (onPlayerClick) {
      onPlayerClick(player.playerId || '');
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-red-400" />
            Combat Efficiency Matrix
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-red-400" />
            Combat Efficiency Matrix
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="text-xs"
            >
              <Filter className="w-3 h-3 mr-1" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
              {filteredData.length} Players
            </Badge>
          </div>
        </CardTitle>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 p-4 bg-gray-700 rounded-lg">
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Alliance</label>
              <select
                value={allianceFilter}
                onChange={(e) => setAllianceFilter(e.target.value)}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
              >
                {ALLIANCE_FILTER_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-300">Power Range</label>
              <div className="px-2">
                <input
                  type="range"
                  min={0}
                  max={250000000}
                  step={1000000}
                  value={powerRange[1]}
                  onChange={(e) => setPowerRange([powerRange[0], parseInt(e.target.value)])}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{formatNumber(powerRange[0])}</span>
                  <span>{formatNumber(powerRange[1])}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-300">Results Limit</label>
              <select
                value={resultLimit}
                onChange={(e) => setResultLimit(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
              >
                <option value="all">All Players</option>
                <option value={50}>50 Players</option>
                <option value={100}>100 Players</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hide-inactive"
                  checked={hideInactive}
                  onChange={(e) => setHideInactive(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="hide-inactive" className="text-sm text-gray-300">
                  Hide Inactive Players
                </label>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Alliance Averages Summary */}
        {allianceAverages && (
          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Managed Alliance Averages</h3>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(METRIC_CONFIG).map(([key, config]) => {
                const metric = key as keyof CombatMetrics;
                const IconComponent = config.icon;
                const value = allianceAverages[metric];
                
                return (
                  <div key={key} className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <IconComponent className={`w-3 h-3 ${config.color}`} />
                      <span className="text-xs text-gray-400">{config.label}</span>
                    </div>
                    <div className={`text-sm font-medium ${config.color}`}>
                      {config.formatter(value)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Heat Map Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-left p-2 text-gray-300">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('name')}
                    className="text-gray-300 hover:text-white p-0 h-auto font-medium"
                  >
                    Player
                    <ArrowUpDown className="w-3 h-3 ml-1" />
                  </Button>
                </th>
                <th className="text-left p-2 text-gray-300">Alliance</th>
                <th className="text-center p-2 text-gray-300">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('power')}
                    className="text-gray-300 hover:text-white p-0 h-auto font-medium"
                  >
                    Power
                    <ArrowUpDown className="w-3 h-3 ml-1" />
                  </Button>
                </th>
                {Object.entries(METRIC_CONFIG).map(([key, config]) => {
                  const IconComponent = config.icon;
                  return (
                    <th key={key} className="text-center p-2 text-gray-300">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort(key as keyof CombatMetrics)}
                        className="text-gray-300 hover:text-white p-0 h-auto font-medium flex items-center gap-1"
                      >
                        <IconComponent className={`w-3 h-3 ${config.color}`} />
                        {config.label}
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((player, index) => (
                <tr
                  key={player.playerId || index}
                  className="border-b border-gray-700 hover:bg-gray-700/50 cursor-pointer transition-colors"
                  onClick={() => handlePlayerClick(player)}
                >
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">
                        {player.name || player.currentName}
                      </span>
                      {player.isTopPerformer && (
                        <Trophy className="w-4 h-4 text-yellow-400" />
                      )}
                      {player.hasLeftRealm && (
                        <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                          Left
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-2">
                    {player.allianceTag ? (
                      <Badge className={`text-xs ${getManagedAllianceColor(player.allianceTag)}`}>
                        {player.allianceTag}
                        {isManagedAlliance(player.allianceTag) && ' ★'}
                      </Badge>
                    ) : (
                      <span className="text-gray-500 text-xs">No Alliance</span>
                    )}
                  </td>
                  <td className="p-2 text-center text-gray-300">
                    {formatNumber(parseInt(player.currentPower || '0'))}
                  </td>
                  {Object.entries(METRIC_CONFIG).map(([key, config]) => {
                    const metric = key as keyof CombatMetrics;
                    const value = player.metrics[metric];
                    const percentile = player.percentiles[metric];
                    const colorClass = getHeatmapColor(percentile);
                    
                    return (
                      <td key={key} className="p-2 text-center">
                        <div
                          className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}
                          title={`${config.formatter(value)} (${percentile.toFixed(1)}th percentile)`}
                        >
                          {config.formatter(value)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No players match the current filters</p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">Top Performers</p>
            <p className="text-lg font-bold text-yellow-400">
              {filteredData.filter(p => p.isTopPerformer).length}
            </p>
          </div>
          <div className="bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">Managed Alliance</p>
            <p className="text-lg font-bold text-blue-400">
              {filteredData.filter(p => p.allianceTag && isManagedAlliance(p.allianceTag)).length}
            </p>
          </div>
          <div className="bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">Active Players</p>
            <p className="text-lg font-bold text-green-400">
              {filteredData.filter(p => !p.hasLeftRealm).length}
            </p>
          </div>
          <div className="bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">Total Shown</p>
            <p className="text-lg font-bold text-white">
              {filteredData.length}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}