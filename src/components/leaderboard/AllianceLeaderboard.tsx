'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Users, 
  Zap, 
  Sword, 
  Trophy, 
  Crown,
  ChevronUp,
  ChevronDown,
  Target,
  BarChart3
} from 'lucide-react';

interface Alliance {
  rank: number;
  tag: string;
  memberCount: number;
  totalPower: number;
  averagePower: number;
  totalKills: number;
  totalDeaths: number;
  totalMerits: number;
  totalVictories: number;
  totalDefeats: number;
  killDeathRatio: string | number;
  winRate: string | number;
  averageLevel: number;
  topPlayer: {
    name: string;
    power: number;
    lordId?: string;
  };
}

interface AllianceLeaderboardData {
  alliances: Alliance[];
  totalAlliances: number;
  sortBy: string;
  order: string;
}

interface AllianceLeaderboardProps {
  data: AllianceLeaderboardData | null;
  loading: boolean;
  onSort: (metric: string) => void;
  onAllianceClick?: (alliance: Alliance) => void;
}

const allianceMetrics = [
  { key: 'totalPower', label: 'Total Power', icon: Zap, format: 'number' },
  { key: 'memberCount', label: 'Members', icon: Users, format: 'number' },
  { key: 'averagePower', label: 'Avg Power', icon: BarChart3, format: 'number' },
  { key: 'totalKills', label: 'Total Kills', icon: Sword, format: 'number' },
  { key: 'totalMerits', label: 'Total Merits', icon: Trophy, format: 'number' },
  { key: 'killDeathRatio', label: 'K/D Ratio', icon: Target, format: 'ratio' },
  { key: 'winRate', label: 'Win Rate', icon: Crown, format: 'percentage' },
  { key: 'averageLevel', label: 'Avg Level', icon: Shield, format: 'number' }
];

export function AllianceLeaderboard({ 
  data, 
  loading, 
  onSort, 
  onAllianceClick 
}: AllianceLeaderboardProps) {
  const [selectedMetrics, setSelectedMetrics] = useState([
    'totalPower', 'memberCount', 'averagePower', 'totalKills', 'killDeathRatio'
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
        return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Crown className="w-6 h-6 text-gray-300" />;
      case 3:
        return <Crown className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
            <span className="text-gray-300 text-sm font-bold">#{rank}</span>
          </div>
        );
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
      if (selectedMetrics.length < 6) {
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

  if (!data || data.alliances.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center text-gray-400">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No alliance data available</p>
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
            Select Metrics to Display (3-6 metrics)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {allianceMetrics.map(metric => {
              const isSelected = selectedMetrics.includes(metric.key);
              const Icon = metric.icon;
              return (
                <Button
                  key={metric.key}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleMetric(metric.key)}
                  disabled={!isSelected && selectedMetrics.length >= 6}
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

      {/* Alliance Cards View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {data.alliances.map((alliance) => (
          <Card 
            key={alliance.tag} 
            className={`
              bg-gray-800 border-gray-700 cursor-pointer transition-all duration-200 hover:border-purple-500 hover:shadow-lg
              ${alliance.rank <= 3 ? 'ring-2 ring-purple-500/30' : ''}
            `}
            onClick={() => onAllianceClick?.(alliance)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getRankIcon(alliance.rank)}
                  <div>
                    <CardTitle className="text-white text-lg">{alliance.tag}</CardTitle>
                    <p className="text-gray-400 text-sm">
                      {alliance.memberCount} members
                    </p>
                  </div>
                </div>
                {alliance.rank <= 3 && (
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    Top {alliance.rank}
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                {selectedMetrics.slice(0, 4).map(metricKey => {
                  const metric = allianceMetrics.find(m => m.key === metricKey);
                  const value = alliance[metricKey as keyof Alliance];
                  if (!metric) return null;
                  
                  const Icon = metric.icon;
                  
                  return (
                    <div key={metricKey} className="p-3 bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4 text-purple-400" />
                        <span className="text-xs text-gray-400">{metric.label}</span>
                      </div>
                      <p className="text-white font-bold">
                        {formatValue(value, metric.format)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Top Player */}
              <div className="p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-gray-400">Top Player</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium truncate">
                    {alliance.topPlayer.name}
                  </span>
                  <span className="text-purple-400 text-sm">
                    {formatNumber(alliance.topPlayer.power)}
                  </span>
                </div>
              </div>

              {/* Additional Metrics */}
              {selectedMetrics.length > 4 && (
                <div className="space-y-2">
                  {selectedMetrics.slice(4).map(metricKey => {
                    const metric = allianceMetrics.find(m => m.key === metricKey);
                    const value = alliance[metricKey as keyof Alliance];
                    if (!metric) return null;
                    
                    const Icon = metric.icon;
                    
                    return (
                      <div key={metricKey} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-400">{metric.label}:</span>
                        </div>
                        <span className="text-white font-medium">
                          {formatValue(value, metric.format)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sort Controls */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">Sort by:</span>
            <div className="flex flex-wrap gap-2">
              {allianceMetrics.map(metric => {
                const Icon = metric.icon;
                const isActive = data.sortBy === metric.key;
                
                return (
                  <Button
                    key={metric.key}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onSort(metric.key)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {metric.label}
                    {isActive && getSortIcon(metric.key)}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}