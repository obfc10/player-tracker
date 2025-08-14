'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronUp, 
  ChevronDown, 
  Crown, 
  User, 
  Sword, 
  Shield, 
  Zap,
  Trophy,
  Target,
  Heart,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Player {
  rank: number;
  lordId: string;
  name: string;
  currentName: string;
  allianceTag: string | null;
  division: number;
  cityLevel: number;
  faction: string | null;
  currentPower: number;
  unitsKilled: number;
  unitsDead: number;
  unitsHealed: number;
  merits: number;
  victories: number;
  defeats: number;
  killDeathRatio: string | number;
  winRate: string | number;
  helpsGiven: number;
  citySieges: number;
  scouted: number;
  [key: string]: any;
}

interface LeaderboardData {
  players: Player[];
  totalPlayers: number;
  currentPage: number;
  totalPages: number;
  sortBy: string;
  order: string;
  alliance: string;
  alliances: string[];
}

interface LeaderboardTableProps {
  data: LeaderboardData | null;
  loading: boolean;
  onSort: (metric: string) => void;
  onAllianceFilter: (alliance: string) => void;
  onPageChange: (page: number) => void;
  onPlayerClick?: (player: Player) => void;
}

const metrics = [
  { key: 'currentPower', label: 'Power', icon: Zap, format: 'number' },
  { key: 'unitsKilled', label: 'Kills', icon: Sword, format: 'number' },
  { key: 'unitsDead', label: 'Deaths', icon: Shield, format: 'number' },
  { key: 'merits', label: 'Merits', icon: Trophy, format: 'number' },
  { key: 'killDeathRatio', label: 'K/D', icon: Target, format: 'ratio' },
  { key: 'victories', label: 'Wins', icon: Crown, format: 'number' },
  { key: 'defeats', label: 'Losses', icon: Heart, format: 'number' },
  { key: 'winRate', label: 'Win %', icon: Trophy, format: 'percentage' },
  { key: 'cityLevel', label: 'Level', icon: User, format: 'number' },
  { key: 'helpsGiven', label: 'Helps', icon: Heart, format: 'number' }
];

export function LeaderboardTable({ 
  data, 
  loading, 
  onSort, 
  onAllianceFilter, 
  onPageChange, 
  onPlayerClick 
}: LeaderboardTableProps) {
  const [selectedMetrics, setSelectedMetrics] = useState([
    'currentPower', 'unitsKilled', 'unitsDead', 'merits', 'killDeathRatio'
  ]);

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

  const formatValue = (value: any, format: string) => {
    switch (format) {
      case 'number':
        return typeof value === 'number' ? formatNumber(value) : value;
      case 'ratio':
        return value === 'N/A' ? 'N/A' : value;
      case 'percentage':
        return value === 'N/A' ? 'N/A' : `${value}%`;
      default:
        return value;
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Crown className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Crown className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-gray-400">#{rank}</span>;
    }
  };

  const getSortIcon = (metric: string) => {
    if (data?.sortBy !== metric) {
      return <ChevronDown className="w-4 h-4 text-gray-500" />;
    }
    return data.order === 'asc' ? 
      <ChevronUp className="w-4 h-4 text-purple-400" /> :
      <ChevronDown className="w-4 h-4 text-purple-400" />;
  };

  const toggleMetric = (metric: string) => {
    if (selectedMetrics.includes(metric)) {
      if (selectedMetrics.length > 3) {
        setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
      }
    } else {
      if (selectedMetrics.length < 8) {
        setSelectedMetrics([...selectedMetrics, metric]);
      }
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.players.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center text-gray-400">
          <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No leaderboard data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Metric Selection */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-sm">
            Select Metrics to Display (3-8 metrics)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {metrics.map(metric => {
              const isSelected = selectedMetrics.includes(metric.key);
              const Icon = metric.icon;
              return (
                <Button
                  key={metric.key}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleMetric(metric.key)}
                  disabled={!isSelected && selectedMetrics.length >= 8}
                  className="flex items-center gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {metric.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Alliance Filter */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-300">Filter by Alliance:</label>
            <select
              value={data.alliance}
              onChange={(e) => onAllianceFilter(e.target.value)}
              className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            >
              <option value="all">All Alliances</option>
              {data.alliances.map(alliance => (
                <option key={alliance} value={alliance}>{alliance}</option>
              ))}
            </select>
            <span className="text-sm text-gray-400">
              Showing {data.players.length} of {data.totalPlayers} players
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="sticky left-0 bg-gray-900 px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider z-10">
                    Rank
                  </th>
                  <th className="sticky left-16 bg-gray-900 px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider z-10 min-w-48">
                    Player
                  </th>
                  {selectedMetrics.map(metricKey => {
                    const metric = metrics.find(m => m.key === metricKey);
                    if (!metric) return null;
                    const Icon = metric.icon;
                    
                    return (
                      <th
                        key={metricKey}
                        onClick={() => onSort(metricKey)}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {metric.label}
                          {getSortIcon(metricKey)}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {data.players.map((player) => (
                  <tr
                    key={player.lordId}
                    onClick={() => onPlayerClick?.(player)}
                    className="hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <td className="sticky left-0 bg-gray-800 px-4 py-3 z-10">
                      <div className="flex items-center gap-2">
                        {getRankIcon(player.rank)}
                      </div>
                    </td>
                    <td className="sticky left-16 bg-gray-800 px-4 py-3 z-10 min-w-48">
                      <div>
                        <p className="text-white font-medium truncate">{player.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {player.allianceTag && (
                            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                              {player.allianceTag}
                            </Badge>
                          )}
                          <span className="text-gray-400 text-xs">
                            ID: {player.lordId}
                          </span>
                        </div>
                      </div>
                    </td>
                    {selectedMetrics.map(metricKey => {
                      const metric = metrics.find(m => m.key === metricKey);
                      const value = player[metricKey];
                      
                      return (
                        <td key={metricKey} className="px-4 py-3 text-sm text-white">
                          {formatValue(value, metric?.format || 'number')}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                Page {data.currentPage} of {data.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(data.currentPage - 1)}
                  disabled={data.currentPage <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                  let pageNum;
                  if (data.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (data.currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (data.currentPage >= data.totalPages - 2) {
                    pageNum = data.totalPages - 4 + i;
                  } else {
                    pageNum = data.currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={data.currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onPageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(data.currentPage + 1)}
                  disabled={data.currentPage >= data.totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}