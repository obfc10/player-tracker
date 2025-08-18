'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSeason } from '@/contexts/SeasonContext';
// import { SeasonSelector } from '@/components/SeasonSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExportButton } from '@/components/ui/export-button';
import { ExportConfigs } from '@/lib/export';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Sword,
  Shield,
  Activity,
  Gauge,
  Layers,
  Calculator,
  MapPin,
  DollarSign,
  Flame,
  AlignLeft
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
  victories: string;
  defeats: string;
  
  // Core metrics
  rawMerits: number;
  rawPower: number;
  rawKills: number;
  
  // Advanced analytics
  meritPowerRatio: number;
  meritDensity: number;
  meritROI: number;
  meritPercentile: number;
  kingdomRank: number;
  powerTier: string;
  allianceMeritShare: number;
  meritGap: number;
  nextMilestone: number;
  battleEfficiency: number;
  winRate: number;
  
  // Growth metrics (when available)
  meritGrowth?: number;
  meritGrowthPercent?: number;
  meritVelocity?: number;
  meritAcceleration?: number;
  consistencyScore?: number;
  momentumScore?: number;
  powerGrowth?: number;
  historicalDataPoints?: number;
}

interface AllianceAnalysis {
  allianceTag: string;
  memberCount: number;
  totalMerits: number;
  averageMerits: number;
  topContributor: {
    name: string;
    merits: number;
    share: number;
  };
  members: Array<{
    name: string;
    merits: number;
    share: number;
    percentile: number;
  }>;
}

interface MeritData {
  // Core categories
  topMerits: MeritPlayer[];
  topEfficiency: MeritPlayer[];
  topGrowth: MeritPlayer[];
  
  // Advanced analytics
  topDensity: MeritPlayer[];
  topROI: MeritPlayer[];
  topPercentile: MeritPlayer[];
  topVelocity: MeritPlayer[];
  topAcceleration: MeritPlayer[];
  topConsistency: MeritPlayer[];
  topMomentum: MeritPlayer[];
  
  // Alliance analysis
  allianceAnalysis: AllianceAnalysis[];
  availableAlliances: string[];
  selectedAlliance: string;
  
  // Kingdom statistics
  kingdomStats: {
    totalMerits: string;
    averageMerits: number;
    averageEfficiency: number;
    totalPlayers: number;
    filteredPlayers: number;
    totalAlliances: number;
    averageMeritDensity: number;
  };
  
  // Meta information
  timeframe: string;
  snapshotInfo: {
    current: string;
    compare: string | null;
    totalSnapshots: number;
  };
}

export default function MeritsPage() {
  const router = useRouter();
  const { selectedSeasonMode, selectedSeasonId, loading: seasonLoading } = useSeason();
  const [data, setData] = useState<MeritData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('current'); // current, week, month
  const [selectedAlliance, setSelectedAlliance] = useState('all');
  const [activeTab, setActiveTab] = useState('core');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted) {
      fetchMeritData();
    }
  }, [timeframe, selectedSeasonMode, selectedSeasonId, selectedAlliance, hasMounted]);

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
        alliance: selectedAlliance,
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

  const formatDecimal = (value: number, decimals: number = 1) => {
    const num = value || 0;
    if (isNaN(num) || !isFinite(num)) return '0';
    return num.toFixed(decimals);
  };

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 99) return 'text-yellow-400';
    if (percentile >= 95) return 'text-orange-400';
    if (percentile >= 90) return 'text-red-400';
    if (percentile >= 75) return 'text-purple-400';
    if (percentile >= 50) return 'text-blue-400';
    return 'text-gray-400';
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Over 100M': return 'text-yellow-400';
      case '50M-100M': return 'text-orange-400';
      case '10M-50M': return 'text-red-400';
      case '1M-10M': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const renderPlayerTable = (
    players: MeritPlayer[], 
    title: string, 
    icon: React.ElementType,
    valueFormatter: (player: MeritPlayer) => { value: string; label: string; color?: string }
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
              const { value, label, color } = valueFormatter(player);
              return (
                <div 
                  key={player.playerId}
                  className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
                  onClick={() => handlePlayerClick(player)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">#{(index + 1).toString()}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{player.currentName || player.name}</p>
                      <div className="flex items-center gap-2 text-sm">
                        {player.allianceTag && (
                          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                            {player.allianceTag}
                          </Badge>
                        )}
                        <span className="text-gray-400">Lv.{player.cityLevel || '0'}</span>
                        <span className="text-gray-400">#{player.kingdomRank || '?'}</span>
                        <span className={`text-xs ${getPercentileColor(player.meritPercentile)}`}>
                          {formatDecimal(player.meritPercentile)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${color || 'text-yellow-400'}`}>{value}</p>
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
              Advanced Merit Analytics
            </h1>
            <p className="text-gray-400">
              Comprehensive merit tracking with velocity, consistency, and efficiency analysis
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
                  battleEfficiency: player.battleEfficiency || 0,
                  cityLevel: player.cityLevel || 0,
                  division: player.division || 0,
                  percentile: player.meritPercentile || 0,
                  meritDensity: player.meritDensity || 0
                }))}
                exportConfig={ExportConfigs.merits}
                filename={`advanced_merit_analytics_${new Date().toISOString().split('T')[0]}`}
                title="Kingdom 671 - Advanced Merit Analytics"
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

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alliance Filter */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Alliance Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={selectedAlliance}
              onChange={(e) => setSelectedAlliance(e.target.value)}
              className={`w-full px-3 py-2 border rounded text-sm transition-all duration-200 ${
                selectedAlliance !== 'all' 
                  ? 'bg-purple-700 border-purple-500 text-white shadow-lg' 
                  : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
              }`}
            >
              <option value="all">All Alliances</option>
              {data?.availableAlliances?.map(alliance => (
                <option key={alliance} value={alliance}>{alliance}</option>
              ))}
            </select>
            {selectedAlliance !== 'all' && (
              <Badge className="bg-purple-600/30 text-purple-200 border-purple-500/50 shadow-lg mt-2">
                {selectedAlliance}
              </Badge>
            )}
          </CardContent>
        </Card>
        
        {/* Timeframe Selection */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Analysis Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {[
                { key: 'current', label: 'Current' },
                { key: 'week', label: 'Week' },
                { key: 'month', label: 'Month' }
              ].map(period => (
                <Button
                  key={period.key}
                  variant={timeframe === period.key ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setTimeframe(period.key)}
                  className={`transition-all duration-200 ${
                    timeframe === period.key 
                      ? 'bg-purple-600 border-purple-500 text-white hover:bg-purple-700 shadow-lg' 
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500'
                  }`}
                >
                  {period.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.kingdomStats && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Filtered Players:</span>
                  <span className="text-white">{data.kingdomStats.filteredPlayers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Alliances:</span>
                  <span className="text-white">{data.kingdomStats.totalAlliances}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Density:</span>
                  <span className="text-white">{formatDecimal(data.kingdomStats.averageMeritDensity)}</span>
                </div>
              </div>
            )}
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

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-800 w-full justify-start">
          <TabsTrigger value="core" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Core Metrics
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Advanced Analytics
          </TabsTrigger>
          <TabsTrigger value="growth" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Growth & Momentum
            {timeframe === 'current' && (
              <span className="text-xs bg-yellow-600 text-yellow-200 px-1 rounded">
                Week/Month
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="alliances" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Alliance Analysis
          </TabsTrigger>
        </TabsList>

        {/* Core Metrics */}
        <TabsContent value="core">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {renderPlayerTable(
              data?.topMerits || [],
              'Top Total Merits',
              Trophy,
              (player) => ({
                value: formatNumber(player.merits),
                label: `${formatNumber(player.currentPower)} power`
              })
            )}

            {renderPlayerTable(
              data?.topEfficiency || [],
              'Top Merit Efficiency',
              Target,
              (player) => ({
                value: formatRatio(player.meritPowerRatio),
                label: `${formatNumber(player.merits)} merits`
              })
            )}


            {renderPlayerTable(
              data?.topPercentile || [],
              'Kingdom Elite (Top Percentiles)',
              Crown,
              (player) => ({
                value: `${formatDecimal(player.meritPercentile)}%`,
                label: `Rank #${player.kingdomRank}`,
                color: getPercentileColor(player.meritPercentile)
              })
            )}
          </div>
        </TabsContent>

        {/* Advanced Analytics */}
        <TabsContent value="advanced">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {renderPlayerTable(
              data?.topDensity || [],
              'Merit Density by Power',
              Layers,
              (player) => ({
                value: formatDecimal(player.meritDensity),
                label: `${player.powerTier}`,
                color: getTierColor(player.powerTier)
              })
            )}

            {renderPlayerTable(
              data?.topROI || [],
              'Merit ROI (Return on Investment)',
              DollarSign,
              (player) => ({
                value: formatDecimal(player.meritROI),
                label: `Per 1M power invested`
              })
            )}

            {data?.topGrowth && data.topGrowth.length > 0 && renderPlayerTable(
              data.topGrowth,
              'Merit Gap Analysis',
              MapPin,
              (player) => ({
                value: formatNumber(player.meritGap),
                label: `to ${formatNumber(player.nextMilestone)}`
              })
            )}

          </div>
        </TabsContent>

        {/* Growth & Momentum */}
        <TabsContent value="growth">
          {timeframe === 'current' ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8 text-center">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-bold text-white mb-2">Growth & Momentum Analysis</h3>
                <p className="text-gray-400 mb-6">
                  Growth metrics require historical data comparison. Switch to Week or Month timeframe to see velocity, acceleration, consistency, and momentum analytics.
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    onClick={() => setTimeframe('week')}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    View Week Analysis
                  </Button>
                  <Button
                    onClick={() => setTimeframe('month')}
                    variant="outline"
                    className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                  >
                    View Month Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {data?.topVelocity && data.topVelocity.length > 0 ? renderPlayerTable(
                data.topVelocity,
                'Merit Velocity (Daily Rate)',
                Gauge,
                (player) => ({
                  value: `${formatNumber(player.meritVelocity || 0)}/day`,
                  label: `${formatNumber(player.meritGrowth || 0)} total growth`
                })
              ) : (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Gauge className="w-5 h-5 text-yellow-400" />
                      Merit Velocity (Daily Rate)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-gray-400">
                      <Gauge className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No velocity data available</p>
                      <p className="text-sm mt-2">Players need positive daily merit gains to appear here</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {data?.topAcceleration && data.topAcceleration.length > 0 ? renderPlayerTable(
                data.topAcceleration,
                'Merit Acceleration',
                TrendingUp,
                (player) => ({
                  value: `${player.meritAcceleration && player.meritAcceleration > 0 ? '+' : ''}${formatDecimal(player.meritAcceleration || 0)}`,
                  label: 'Change in velocity',
                  color: (player.meritAcceleration || 0) > 0 ? 'text-green-400' : 
                         (player.meritAcceleration || 0) < 0 ? 'text-red-400' : 'text-gray-400'
                })
              ) : (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-yellow-400" />
                      Merit Acceleration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-gray-400">
                      <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No acceleration data available</p>
                      <p className="text-sm mt-2">Requires at least 14 days of historical data to calculate acceleration</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {data?.topConsistency && data.topConsistency.length > 0 ? renderPlayerTable(
                data.topConsistency,
                'Merit Consistency Score',
                AlignLeft,
                (player) => ({
                  value: `${formatDecimal(player.consistencyScore || 0)}%`,
                  label: `${player.historicalDataPoints || 0} data points`
                })
              ) : (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <AlignLeft className="w-5 h-5 text-yellow-400" />
                      Merit Consistency Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-gray-400">
                      <AlignLeft className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No consistency data available</p>
                      <p className="text-sm mt-2">Requires consistent merit activity over time</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {data?.topMomentum && data.topMomentum.length > 0 ? renderPlayerTable(
                data.topMomentum,
                'Merit Momentum (Recent Activity)',
                Flame,
                (player) => ({
                  value: formatNumber(player.momentumScore || 0),
                  label: 'Weighted recent gains'
                })
              ) : (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Flame className="w-5 h-5 text-yellow-400" />
                      Merit Momentum (Recent Activity)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-gray-400">
                      <Flame className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No momentum data available</p>
                      <p className="text-sm mt-2">Requires recent merit activity to calculate momentum</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Alliance Analysis */}
        <TabsContent value="alliances">
          <div className="space-y-6">
            {data?.allianceAnalysis && data.allianceAnalysis.length > 0 && (
              <div className="grid grid-cols-1 gap-6">
                {data.allianceAnalysis.slice(0, 10).map((alliance, index) => (
                  <Card key={alliance.allianceTag} className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">#{index + 1}</span>
                          </div>
                          <Shield className="w-6 h-6 text-blue-400" />
                          <span>{alliance.allianceTag}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-yellow-400">
                            {formatNumber(alliance.totalMerits)}
                          </p>
                          <p className="text-sm text-gray-400">Total Merits</p>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-400">Members</p>
                          <p className="text-xl font-bold text-white">{alliance.memberCount}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Average Merits</p>
                          <p className="text-xl font-bold text-blue-400">{formatNumber(alliance.averageMerits)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Top Contributor</p>
                          <p className="text-lg font-bold text-green-400">{alliance.topContributor.name}</p>
                          <p className="text-sm text-gray-400">
                            {formatNumber(alliance.topContributor.merits)} ({formatDecimal(alliance.topContributor.share)}%)
                          </p>
                        </div>
                      </div>
                      
                      {alliance.members.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-400 mb-2">Top Members:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {alliance.members.slice(0, 6).map((member, memberIndex) => (
                              <div key={memberIndex} className="bg-gray-700 p-2 rounded text-sm">
                                <p className="text-white font-medium">{member.name}</p>
                                <p className="text-gray-400">
                                  {formatNumber(member.merits)} ({formatDecimal(member.share)}%)
                                </p>
                                <p className={`text-xs ${getPercentileColor(member.percentile)}`}>
                                  {formatDecimal(member.percentile)}% percentile
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Analytics Guide */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Advanced Merit Analytics Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-green-400" />
                Merit Efficiency & Density
              </h4>
              <p className="text-gray-400">
                Merit/Power ratio shows combat effectiveness. Merit density compares players at similar development stages.
              </p>
            </div>
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Velocity & Acceleration
              </h4>
              <p className="text-gray-400">
                Velocity tracks daily merit gains. Acceleration shows if players are speeding up or slowing down.
              </p>
            </div>
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                Consistency & Momentum
              </h4>
              <p className="text-gray-400">
                Consistency measures reliable activity. Momentum weighs recent performance more heavily.
              </p>
            </div>
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-400" />
                Percentile Ranking
              </h4>
              <p className="text-gray-400">
                Shows where players rank in the kingdom (top 1%, 5%, 10%, etc.) for relative performance context.
              </p>
            </div>
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                Merit ROI
              </h4>
              <p className="text-gray-400">
                Merit return on investment - shows most cost-effective players in terms of merit gains vs power investment.
              </p>
            </div>
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                Alliance Distribution
              </h4>
              <p className="text-gray-400">
                Shows individual contribution levels within alliances and identifies top contributors and merit shares.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}