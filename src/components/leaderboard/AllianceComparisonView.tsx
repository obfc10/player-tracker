'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ExportButton } from '@/components/ui/export-button';
import { 
  Shield, 
  Users, 
  Zap, 
  Trophy, 
  TrendingUp, 
  AlertTriangle,
  Download,
  CheckSquare,
  Square
} from 'lucide-react';

interface Player {
  rank: number;
  lordId: string;
  name: string;
  currentName: string;
  allianceTag: string | null;
  currentPower: number;
  merits: number;
  unitsKilled: number;
  meritEfficiency: number;
  powerEfficiency: number;
  isUnderperformer: boolean;
  riskLevel: 'none' | 'yellow' | 'red';
  performanceTier: 'top' | 'middle' | 'bottom';
  meritTrend: number[];
}

interface AllianceStats {
  tag: string;
  totalMerits: number;
  averageMerits: number;
  memberCount: number;
  totalPower: number;
  averagePower: number;
  meritEfficiency: number;
  topPerformers: Player[];
  underperformers: Player[];
}

interface AllianceComparisonData {
  plac: AllianceStats;
  flas: AllianceStats;
  comparison: {
    meritDifference: number;
    powerDifference: number;
    efficiencyDifference: number;
  };
  allPlayers: Player[];
}

interface AllianceComparisonViewProps {
  data: AllianceComparisonData | null;
  loading: boolean;
  onRefresh: () => void;
}

export function AllianceComparisonView({ data, loading, onRefresh }: AllianceComparisonViewProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [showEfficiencyRankings, setShowEfficiencyRankings] = useState(false);

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

  const getAllianceColor = (tag: string) => {
    switch (tag) {
      case 'PLAC':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'FLAs':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getPerformanceTierColor = (tier: string) => {
    switch (tier) {
      case 'top':
        return 'text-green-400';
      case 'middle':
        return 'text-yellow-400';
      case 'bottom':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'red':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'yellow':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default:
        return '';
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      newSelected.add(playerId);
    }
    setSelectedPlayers(newSelected);
  };

  const selectAllPlayers = () => {
    if (!data) return;
    const allPlayerIds = data.allPlayers.map(p => p.lordId);
    setSelectedPlayers(new Set(allPlayerIds));
  };

  const clearSelection = () => {
    setSelectedPlayers(new Set());
  };

  const getSelectedPlayersData = () => {
    if (!data) return [];
    return data.allPlayers.filter(p => selectedPlayers.has(p.lordId));
  };

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

  if (!data) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center text-gray-400">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No alliance comparison data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alliance vs Alliance Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PLAC Stats */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge className={getAllianceColor('PLAC')}>PLAC</Badge>
              <span className="text-blue-300">Alliance Statistics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Total Merits</p>
                <p className="text-xl font-bold text-white">{formatNumber(data.plac.totalMerits)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Avg Merits/Member</p>
                <p className="text-xl font-bold text-white">{formatNumber(data.plac.averageMerits)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Power</p>
                <p className="text-xl font-bold text-white">{formatNumber(data.plac.totalPower)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Merit Efficiency</p>
                <p className="text-xl font-bold text-white">{data.plac.meritEfficiency.toFixed(2)}</p>
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">Top 5 Performers</p>
              <div className="space-y-1">
                {data.plac.topPerformers.slice(0, 5).map((player, index) => (
                  <div key={player.lordId} className="flex justify-between text-sm">
                    <span className="text-white">{index + 1}. {player.name}</span>
                    <span className="text-blue-300">{formatNumber(player.merits)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FLAs Stats */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge className={getAllianceColor('FLAs')}>FLAs</Badge>
              <span className="text-green-300">Alliance Statistics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Total Merits</p>
                <p className="text-xl font-bold text-white">{formatNumber(data.flas.totalMerits)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Avg Merits/Member</p>
                <p className="text-xl font-bold text-white">{formatNumber(data.flas.averageMerits)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Power</p>
                <p className="text-xl font-bold text-white">{formatNumber(data.flas.totalPower)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Merit Efficiency</p>
                <p className="text-xl font-bold text-white">{data.flas.meritEfficiency.toFixed(2)}</p>
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">Top 5 Performers</p>
              <div className="space-y-1">
                {data.flas.topPerformers.slice(0, 5).map((player, index) => (
                  <div key={player.lordId} className="flex justify-between text-sm">
                    <span className="text-white">{index + 1}. {player.name}</span>
                    <span className="text-green-300">{formatNumber(player.merits)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Summary */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Alliance Comparison Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Merit Difference</p>
              <p className={`text-xl font-bold ${data.comparison.meritDifference > 0 ? 'text-blue-300' : 'text-green-300'}`}>
                {data.comparison.meritDifference > 0 ? 'PLAC +' : 'FLAs +'}{formatNumber(Math.abs(data.comparison.meritDifference))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Power Difference</p>
              <p className={`text-xl font-bold ${data.comparison.powerDifference > 0 ? 'text-blue-300' : 'text-green-300'}`}>
                {data.comparison.powerDifference > 0 ? 'PLAC +' : 'FLAs +'}{formatNumber(Math.abs(data.comparison.powerDifference))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Efficiency Difference</p>
              <p className={`text-xl font-bold ${data.comparison.efficiencyDifference > 0 ? 'text-blue-300' : 'text-green-300'}`}>
                {data.comparison.efficiencyDifference > 0 ? 'PLAC +' : 'FLAs +'}{Math.abs(data.comparison.efficiencyDifference).toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rankings Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant={!showEfficiencyRankings ? 'default' : 'outline'}
            onClick={() => setShowEfficiencyRankings(false)}
          >
            Merit Rankings
          </Button>
          <Button
            variant={showEfficiencyRankings ? 'default' : 'outline'}
            onClick={() => setShowEfficiencyRankings(true)}
          >
            Efficiency Rankings
          </Button>
        </div>
        
        {/* Bulk Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAllPlayers}>
            <CheckSquare className="w-4 h-4 mr-2" />
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={clearSelection}>
            <Square className="w-4 h-4 mr-2" />
            Clear
          </Button>
          {selectedPlayers.size > 0 && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const selectedData = getSelectedPlayersData().map(player => ({
                    name: player.name,
                    alliance: player.allianceTag || '',
                    power: player.currentPower,
                    merits: player.merits,
                    meritEfficiency: player.meritEfficiency,
                    performanceTier: player.performanceTier,
                    riskLevel: player.riskLevel
                  }));
                  
                  // Simple CSV export for now
                  const csvContent = [
                    ['Name', 'Alliance', 'Power', 'Merits', 'Merit Efficiency', 'Performance Tier', 'Risk Level'],
                    ...selectedData.map(row => [
                      row.name,
                      row.alliance,
                      row.power.toString(),
                      row.merits.toString(),
                      row.meritEfficiency.toFixed(2),
                      row.performanceTier,
                      row.riskLevel
                    ])
                  ].map(row => row.join(',')).join('\n');
                  
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `selected_players_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                disabled={selectedPlayers.size === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Selected ({selectedPlayers.size})
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Player Rankings Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle>
            {showEfficiencyRankings ? 'Merit Efficiency Rankings' : 'Merit Rankings'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Select
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Alliance
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Power
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Merits
                  </th>
                  {showEfficiencyRankings && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Efficiency
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Trend
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {data.allPlayers
                  .sort((a, b) => showEfficiencyRankings ? b.meritEfficiency - a.meritEfficiency : b.merits - a.merits)
                  .map((player, index) => (
                    <tr
                      key={player.lordId}
                      className={`hover:bg-gray-700 transition-colors ${
                        player.riskLevel !== 'none' ? getRiskLevelColor(player.riskLevel) : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selectedPlayers.has(player.lordId)}
                          onCheckedChange={() => togglePlayerSelection(player.lordId)}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge className={`${
                          index < 10 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                          index < 20 ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                          'bg-gray-600/20 text-gray-400 border-gray-600/30'
                        }`}>
                          #{index + 1}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <p className={`font-medium ${getPerformanceTierColor(player.performanceTier)}`}>
                            {player.name}
                          </p>
                          <p className="text-xs text-gray-400">ID: {player.lordId}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {player.allianceTag && (
                          <Badge className={getAllianceColor(player.allianceTag)}>
                            {player.allianceTag}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {formatNumber(player.currentPower)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {formatNumber(player.merits)}
                      </td>
                      {showEfficiencyRankings && (
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {player.meritEfficiency.toFixed(2)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm">
                        {/* Enhanced sparkline representation */}
                        <div className="flex items-end gap-0.5 h-8 w-16">
                          {player.meritTrend.map((value, i) => {
                            const maxValue = Math.max(...player.meritTrend.map(Math.abs));
                            const normalizedHeight = maxValue > 0 ? Math.abs(value) / maxValue : 0;
                            const height = Math.max(2, normalizedHeight * 24); // Min 2px, max 24px
                            
                            return (
                              <div
                                key={i}
                                className={`w-2 rounded-t-sm ${
                                  value > 0 ? 'bg-green-400' :
                                  value < 0 ? 'bg-red-400' :
                                  'bg-gray-400'
                                }`}
                                style={{ height: `${height}px` }}
                                title={`Day ${i + 1}: ${value > 0 ? '+' : ''}${value.toLocaleString()}`}
                              />
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          {player.isUnderperformer && (
                            <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                              At Risk
                            </Badge>
                          )}
                          {player.riskLevel === 'yellow' && (
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                          )}
                          {player.riskLevel === 'red' && (
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}