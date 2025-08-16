'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSeason } from '@/contexts/SeasonContext';
import { SeasonSelector } from '@/components/SeasonSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExportButton } from '@/components/ui/export-button';
import { ExportConfigs } from '@/lib/export';
import {
  Trophy,
  TrendingUp,
  Target,
  Zap,
  Award,
  BarChart3,
  Users,
  Percent,
  RefreshCw,
  Crown,
  Sword
} from 'lucide-react';

interface MeritPlayer {
  playerId: string;
  name: string;
  currentName: string;
  allianceTag: string | null;
  division: number;
  cityLevel: number;
  merits: string;
  currentPower: string;
  unitsKilled: string;
  meritPowerRatio: number;
  meritKillRatio: number;
  meritPerCityLevel: number;
  meritGrowth?: number;
  meritGrowthPercent?: number;
}

interface MeritData {
  topMerits: MeritPlayer[];
  topEfficiency: MeritPlayer[];
  topKillEfficiency: MeritPlayer[];
  topGrowth: MeritPlayer[];
  kingdomStats: {
    totalMerits: string;
    averageMerits: number;
    averageEfficiency: number;
    totalPlayers: number;
  };
  timeframe: string;
}

export default function MeritsPage() {
  const router = useRouter();
  const { selectedSeasonMode, selectedSeasonId, loading: seasonLoading } = useSeason();
  const [data, setData] = useState<MeritData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('current'); // current, week, month
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted) {
      fetchMeritData();
    }
  }, [timeframe, selectedSeasonMode, selectedSeasonId, hasMounted]);

  // Don't render until season context is loaded and component has mounted
  if (seasonLoading || !hasMounted) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  const fetchMeritData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        timeframe,
        seasonMode: selectedSeasonMode || 'current',
        ...(selectedSeasonId && { seasonId: selectedSeasonId })
      });
      const response = await fetch(`/api/merits?${params}`);
      if (response.ok) {
        const meritData = await response.json();
        setData(meritData);
      } else {
        console.error('Failed to fetch merit data');
        setData(null);
      }
    } catch (error) {
      console.error('Error fetching merit data:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerClick = (player: MeritPlayer) => {
    router.push(`/dashboard/player/${player.playerId}`);
  };

  const formatNumber = (value: string | number) => {
    const num = typeof value === 'string' ? parseInt(value) || 0 : value || 0;
    if (isNaN(num)) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const formatRatio = (ratio: number) => {
    const num = ratio || 0;
    if (isNaN(num) || !isFinite(num)) return '0.0%';
    return Math.min(Math.max(num, 0), 999999).toFixed(1) + '%';
  };

  const renderPlayerTable = (
    players: MeritPlayer[], 
    title: string, 
    icon: React.ElementType,
    valueFormatter: (player: MeritPlayer) => { value: string; label: string }
  ) => (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          {React.createElement(icon, { className: "w-5 h-5 text-yellow-400" })}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {players.slice(0, 10).map((player, index) => {
              const { value, label } = valueFormatter(player);
              return (
                <div 
                  key={player.playerId}
                  className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
                  onClick={() => handlePlayerClick(player)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{player.currentName || player.name}</p>
                      <div className="flex items-center gap-2 text-sm">
                        {player.allianceTag && (
                          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                            {player.allianceTag}
                          </Badge>
                        )}
                        <span className="text-gray-400">Lv.{player.cityLevel || 0}</span>
                        <span className="text-gray-400">Div.{player.division || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-400 font-bold">{value}</p>
                    <p className="text-gray-400 text-sm">{label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-400" />
              Merit Analytics
            </h1>
            <p className="text-gray-400">
              Comprehensive merit tracking and efficiency analysis
            </p>
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <ExportButton
                data={[...(data.topMerits || []), ...(data.topEfficiency || [])].map(player => ({
                  playerName: player.currentName || player.name || '',
                  alliance: player.allianceTag || '',
                  merits: player.merits || '0',
                  power: player.currentPower || '0',
                  meritPowerRatio: player.meritPowerRatio || 0,
                  meritKillRatio: player.meritKillRatio || 0,
                  cityLevel: player.cityLevel || 0,
                  division: player.division || 0
                }))}
                exportConfig={ExportConfigs.merits}
                filename={`merit_analytics_${new Date().toISOString().split('T')[0]}`}
                title="Kingdom 671 - Merit Analytics"
                subtitle={`${data.kingdomStats?.totalPlayers || 0} players analyzed | Export generated on ${new Date().toLocaleDateString()}`}
                variant="outline"
                size="sm"
              />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMeritData}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Season and Timeframe Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SeasonSelector />
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Analysis Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {[
                { key: 'current', label: 'Current Snapshot' },
                { key: 'week', label: 'Past Week Growth' },
                { key: 'month', label: 'Past Month Growth' }
              ].map(period => (
                <Button
                  key={period.key}
                  variant={timeframe === period.key ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setTimeframe(period.key)}
                >
                  {period.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kingdom Statistics */}
      {data?.kingdomStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Kingdom Merits</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {formatNumber(data.kingdomStats.totalMerits)}
                  </p>
                </div>
                <Trophy className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Average Merits</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {formatNumber(data.kingdomStats.averageMerits)}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Average Efficiency</p>
                  <p className="text-2xl font-bold text-green-400">
                    {formatRatio(data.kingdomStats.averageEfficiency)}
                  </p>
                </div>
                <Percent className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Players Analyzed</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {(data.kingdomStats.totalPlayers || 0).toLocaleString()}
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Merit Analysis Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Total Merits */}
        {renderPlayerTable(
          data?.topMerits || [],
          'Top Total Merits',
          Trophy,
          (player) => ({
            value: formatNumber(player.merits),
            label: `${formatNumber(player.currentPower)} power`
          })
        )}

        {/* Top Merit Efficiency (Merit/Power Ratio) */}
        {renderPlayerTable(
          data?.topEfficiency || [],
          'Top Merit Efficiency',
          Target,
          (player) => ({
            value: formatRatio(player.meritPowerRatio),
            label: `${formatNumber(player.merits)} merits`
          })
        )}

        {/* Top Kill Efficiency (Merit/Kills Ratio) */}
        {renderPlayerTable(
          data?.topKillEfficiency || [],
          'Top Combat Efficiency',
          Sword,
          (player) => ({
            value: player.meritKillRatio.toFixed(1),
            label: `${formatNumber(player.unitsKilled)} kills`
          })
        )}

        {/* Top Merit Growth */}
        {timeframe !== 'current' && renderPlayerTable(
          data?.topGrowth || [],
          'Top Merit Growth',
          TrendingUp,
          (player) => ({
            value: formatNumber(player.meritGrowth || 0),
            label: `+${Math.max(0, player.meritGrowthPercent || 0).toFixed(1)}%`
          })
        )}
      </div>

      {/* Analysis Tips */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Merit Analysis Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-green-400" />
                Merit Efficiency
              </h4>
              <p className="text-gray-400">
                Merit/Power ratio shows how efficiently players convert power into combat effectiveness. Higher % = better efficiency.
              </p>
            </div>
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <Sword className="w-4 h-4 text-red-400" />
                Combat Efficiency
              </h4>
              <p className="text-gray-400">
                Merit/Kills ratio indicates combat skill. Higher values suggest better target selection and battle tactics.
              </p>
            </div>
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Growth Tracking
              </h4>
              <p className="text-gray-400">
                Merit growth over time shows player activity and improvement. Consistent growth indicates active engagement.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}