'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkline } from '@/components/ui/sparkline';
import { ALLIANCE_FILTER_OPTIONS, getManagedAllianceColor, isManagedAlliance, sortAlliancesByPriority } from '@/lib/alliance-config';
import { 
  Users,
  Crown,
  Zap,
  Trophy,
  AlertTriangle,
  TrendingUp,
  Settings,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react';

interface RawPlayerData {
  lordId: string;
  name: string;
  alliance: string;
  currentPower: number;
  merits: number;
  unitsKilled: number;
  unitsDead: number;
  victories: number;
  defeats: number;
  cityLevel: number;
  division: number;
  faction: string;
  meritHistory: Array<{
    date: string;
    merits: number;
  }>;
}

interface EfficiencyPlayer {
  rank: number;
  lordId: string;
  name: string;
  alliance: string;
  power: number;
  merits: number;
  meritEfficiency: number;
  performanceTier: 'top' | 'middle' | 'bottom';
  isUnderperformer: boolean;
  meritTrend: number[];
}

interface EfficiencyLeaderboardData {
  data: RawPlayerData[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  performance: {
    itemCount: number;
    responseSize: number;
    optimized: boolean;
    queryTime: number;
  };
  alliance: string;
  alliances: string[];
  snapshotInfo: {
    id: string;
    timestamp: string;
    kingdom: string;
    filename: string;
  };
}

interface EfficiencyLeaderboardProps {
  data: EfficiencyLeaderboardData | null;
  loading: boolean;
  selectedPlayers: Set<string>;
  onAllianceFilter: (alliance: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  onPlayerClick: (player: EfficiencyPlayer) => void;
  onPlayerSelect?: (playerId: string, selected: boolean) => void;
  showBulkActions?: boolean;
}

// Configuration for efficiency thresholds
interface EfficiencyConfig {
  elite: number;
  good: number;
  underperformer: number;
}

export function EfficiencyLeaderboard({
  data,
  loading,
  selectedPlayers,
  onAllianceFilter,
  onLoadMore,
  hasMore,
  onPlayerClick,
  onPlayerSelect,
  showBulkActions = false
}: EfficiencyLeaderboardProps) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  // Default efficiency thresholds (out of 100)
  const defaultConfig: EfficiencyConfig = {
    elite: 20,
    good: 10,
    underperformer: 5
  };

  // Configurable efficiency thresholds
  const [efficiencyConfig, setEfficiencyConfig] = useState<EfficiencyConfig>(defaultConfig);
  const [showSettings, setShowSettings] = useState(false);
  const formatNumber = (num: number) => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    if (rank === 2) return 'bg-gray-400/20 text-gray-300 border-gray-400/30';
    if (rank === 3) return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    if (rank <= 10) return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    if (rank <= 50) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
  };

  const getPerformanceTierColor = (tier: string) => {
    switch (tier) {
      case 'top': return 'text-green-400';
      case 'middle': return 'text-yellow-400';
      case 'bottom': return 'text-red-400';
      default: return 'text-gray-300';
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    // efficiency is already in percentage form (e.g., 0.2 for 0.2%)
    if (efficiency >= efficiencyConfig.elite) return 'text-blue-400';
    if (efficiency >= efficiencyConfig.good) return 'text-green-400';
    if (efficiency < efficiencyConfig.underperformer) return 'text-red-400';
    return 'text-green-400'; // All others fall into the 'good' category
  };

  // Process raw data into efficiency players with frontend calculations
  const processedPlayers = useMemo(() => {
    if (!data?.data) return [];

    // Calculate merit efficiency for each player
    const playersWithEfficiency = data.data.map((rawPlayer) => {
      const power = rawPlayer.currentPower || 1; // Avoid division by zero
      const meritEfficiency = (rawPlayer.merits / power) * 100;
      
      // Extract merit trend from history
      const meritTrend = rawPlayer.meritHistory
        ?.slice(-5)
        .map(h => h.merits) || [rawPlayer.merits];

      return {
        ...rawPlayer,
        power: rawPlayer.currentPower,
        meritEfficiency,
        meritTrend,
        isUnderperformer: meritEfficiency < efficiencyConfig.underperformer
      };
    });

    // Sort by merit efficiency (descending)
    const sortedPlayers = playersWithEfficiency.sort((a, b) => b.meritEfficiency - a.meritEfficiency);

    // Calculate performance tiers
    const totalPlayers = sortedPlayers.length;
    const topThreshold = Math.ceil(totalPlayers * 0.2);
    const bottomThreshold = Math.floor(totalPlayers * 0.8);

    // Add rank and performance tier
    return sortedPlayers.map((player, index) => {
      let performanceTier: 'top' | 'middle' | 'bottom';
      if (index < topThreshold) {
        performanceTier = 'top';
      } else if (index >= bottomThreshold) {
        performanceTier = 'bottom';
      } else {
        performanceTier = 'middle';
      }

      return {
        ...player,
        rank: index + 1,
        performanceTier
      };
    });
  }, [data?.data, efficiencyConfig]);

  // Calculate average efficiency
  const averageEfficiency = useMemo(() => {
    if (!processedPlayers.length) return 0;
    const totalEfficiency = processedPlayers.reduce((sum, player) => sum + player.meritEfficiency, 0);
    return totalEfficiency / processedPlayers.length;
  }, [processedPlayers]);

  // Handle threshold changes
  const handleThresholdChange = (key: keyof EfficiencyConfig, value: number) => {
    setEfficiencyConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Reset thresholds to defaults
  const resetThresholds = () => {
    setEfficiencyConfig(defaultConfig);
  };

  // Handle infinite scroll
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    await onLoadMore();
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, onLoadMore]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !isLoadingMore) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [handleLoadMore, hasMore, loading, isLoadingMore]);

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.data || data.data.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center text-gray-400">
          <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No efficiency data found for the current filters</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Alliance Filter */}
        <div className="flex items-center gap-2">
          <select
            value={data.alliance}
            onChange={(e) => onAllianceFilter(e.target.value)}
            className={`px-3 py-2 border rounded text-sm transition-all duration-200 ${
              data.alliance !== 'all' 
                ? 'bg-purple-700 border-purple-500 text-white shadow-lg' 
                : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
            }`}
          >
            {ALLIANCE_FILTER_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            {data.alliances && (
              <optgroup label="All Available Alliances">
                {sortAlliancesByPriority(data.alliances).map(alliance => (
                  <option key={`all-${alliance}`} value={alliance}>
                    {alliance} {isManagedAlliance(alliance) ? '★' : ''}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {data.alliance !== 'all' && (
            <Badge className="bg-purple-600/30 text-purple-200 border-purple-500/50 shadow-lg">
              {data.alliance}
            </Badge>
          )}
        </div>

        {/* Stats & Settings */}
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400">
            Avg Efficiency: <span className="text-green-400 font-medium">{averageEfficiency.toFixed(2)}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Configure
            {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Threshold Configuration Panel */}
      {showSettings && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400" />
                Efficiency Thresholds Configuration
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={resetThresholds}
                className="flex items-center gap-2 text-gray-400 hover:text-white"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Defaults
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-300">Elite Threshold</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={efficiencyConfig.elite}
                    onChange={(e) => handleThresholdChange('elite', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">Elite</Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-blue-300">Good Threshold</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={efficiencyConfig.good}
                    onChange={(e) => handleThresholdChange('good', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">Good</Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-red-300">Underperformer Threshold</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={efficiencyConfig.underperformer}
                    onChange={(e) => handleThresholdChange('underperformer', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">At Risk</Badge>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-400 bg-gray-700/50 p-3 rounded">
              <p className="mb-2"><strong>How it works:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Merit Efficiency = (Player Merits / Player Power) × 100</li>
                <li>Thresholds are set as percentages (e.g., 20 = 20% efficiency)</li>
                <li><span className="text-purple-300">Elite:</span> Players with efficiency ≥ Elite threshold</li>
                <li><span className="text-blue-300">Good:</span> Players with efficiency ≥ Good threshold (but &lt; Elite)</li>
                <li><span className="text-red-300">At Risk:</span> Players below Underperformer threshold</li>
                <li>Changes apply instantly and affect all efficiency calculations and rankings</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Merit Efficiency Rankings
            </span>
            <span className="text-sm text-gray-400 font-normal">
              {processedPlayers.length.toLocaleString()} players
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  {showBulkActions && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300 w-12">
                      <input
                        type="checkbox"
                        className="rounded border-gray-600 bg-gray-700 text-purple-600"
                        onChange={(e) => {
                          processedPlayers.forEach(player => {
                            onPlayerSelect?.(player.lordId, e.target.checked);
                          });
                        }}
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4" />
                      Rank
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Player
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300">
                    Alliance
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Power
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      Merits
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      Efficiency
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Trend
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {processedPlayers.map((player, index) => {
                  return (
                    <tr
                      key={`${player.lordId}-${index}`}
                      onClick={() => onPlayerClick(player)}
                      className={`cursor-pointer transition-colors hover:bg-gray-700 ${
                        player.alliance && isManagedAlliance(player.alliance)
                          ? 'ring-1 ring-yellow-400/30 bg-gray-800/50'
                          : ''
                      } ${
                        player.isUnderperformer ? 'bg-red-900/20 border-l-4 border-red-500' : ''
                      } ${
                        selectedPlayers.has(player.lordId) ? 'bg-purple-900/30' : ''
                      }`}
                    >
                      {showBulkActions && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedPlayers.has(player.lordId)}
                            onChange={(e) => {
                              e.stopPropagation();
                              onPlayerSelect?.(player.lordId, e.target.checked);
                            }}
                            className="rounded border-gray-600 bg-gray-700 text-purple-600"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-300">
                        <Badge className={getRankBadgeColor(player.rank)}>
                          #{player.rank}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        <div>
                          <p className={`font-medium ${getPerformanceTierColor(player.performanceTier)}`}>
                            {player.name}
                            {player.isUnderperformer && (
                              <span className="ml-2 px-1 py-0.5 text-xs bg-red-500/20 text-red-300 rounded flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                At Risk
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400">ID: {player.lordId}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {player.alliance !== 'None' ? (
                          <Badge className={`${
                            isManagedAlliance(player.alliance) 
                              ? getManagedAllianceColor(player.alliance)
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          }`}>
                            {player.alliance}
                            {isManagedAlliance(player.alliance) && (
                              <span className="ml-1 text-xs">★</span>
                            )}
                          </Badge>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {formatNumber(player.power)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {formatNumber(player.merits)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        <span className={getEfficiencyColor(player.meritEfficiency)}>
                          {player.meritEfficiency.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        <Sparkline 
                          data={player.meritTrend} 
                          width={60} 
                          height={20}
                          className="inline-block"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Infinite Scroll Target */}
          <div ref={observerTarget} className="h-10 flex items-center justify-center">
            {(isLoadingMore || loading) && hasMore && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                Loading more players...
              </div>
            )}
            {!hasMore && processedPlayers.length > 25 && (
              <div className="text-gray-500 text-sm">
                All {processedPlayers.length} players loaded
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}