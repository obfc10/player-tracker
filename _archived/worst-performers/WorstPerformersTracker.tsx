'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ExportButton } from '@/components/ui/export-button';
import { PlayerProgressChart } from '@/components/charts/PlayerProgressChart';
import { PlayerDetailCard } from '@/components/player-detail';
import { ExportConfigs } from '@/lib/export';
import { PlayerDetailDto } from '@/types/dto';
import { 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  Settings, 
  TrendingDown, 
  TrendingUp,
  Clock,
  Zap,
  Trophy,
  Target,
  Users
} from 'lucide-react';

// Performance threshold configuration interface
interface PerformanceThresholds {
  minKdRatio: number;
  minWinRate: number;
  minDailyMeritGain: number;
  minPowerGrowthRate: number;
}

// Player performance data interface
interface PlayerPerformanceData extends PlayerDetailDto {
  kdRatio: number;
  winRate: number;
  dailyMeritGain: number;
  powerGrowthRate: number;
  daysInactive: number;
  trend: 'improving' | 'worsening' | 'stable';
  previouslyFlagged: boolean;
  improvementPercentage?: number;
}

// Alert level enum
type AlertLevel = 'critical' | 'warning' | 'recovery';

// Categorized players interface
interface CategorizedPlayers {
  critical: PlayerPerformanceData[];
  warning: PlayerPerformanceData[];
  recovery: PlayerPerformanceData[];
}

// Component props interface
interface WorstPerformersTrackerProps {
  players: PlayerDetailDto[];
  onPlayerSelect: (playerId: string) => void;
}

// Default thresholds
const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  minKdRatio: 10,
  minWinRate: 60,
  minDailyMeritGain: 100,
  minPowerGrowthRate: 0.5
};

export function WorstPerformersTracker({
  players,
  onPlayerSelect
}: WorstPerformersTrackerProps) {
  const [thresholds, setThresholds] = useState<PerformanceThresholds>(DEFAULT_THRESHOLDS);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerPerformanceData | null>(null);

  // Transform real player data into performance data
  const transformPlayerData = (player: PlayerDetailDto): PlayerPerformanceData => {
    const unitsKilled = parseInt(player.unitsKilled || '0');
    const unitsDead = parseInt(player.unitsDead || '0');
    const victories = player.victories || 0;
    const defeats = player.defeats || 0;
    const merits = parseInt(player.merits || '0');
    
    // Calculate performance metrics
    const kdRatio = unitsDead > 0 ? unitsKilled / unitsDead : unitsKilled;
    const winRate = (victories + defeats) > 0 ? (victories / (victories + defeats)) * 100 : 0;
    
    // Estimate daily merit gain (simplified calculation)
    const dailyMeritGain = Math.max(50, Math.min(200, merits / 1000));
    
    // Estimate power growth rate (simplified - would need historical data)
    const powerGrowthRate = Math.random() * 2 - 0.5; // Random for now, would be calculated from historical data
    
    // Estimate days inactive (simplified - would need last seen data)
    const daysInactive = player.lastSeenAt
      ? Math.floor((Date.now() - new Date(player.lastSeenAt).getTime()) / (1000 * 60 * 60 * 24))
      : Math.floor(Math.random() * 30); // Random for demo
    
    // Determine trend based on metrics
    let trend: 'improving' | 'worsening' | 'stable' = 'stable';
    if (kdRatio > 5 && winRate > 60) trend = 'improving';
    else if (kdRatio < 2 && winRate < 40) trend = 'worsening';
    
    // Randomly assign some players as previously flagged for demo
    const previouslyFlagged = Math.random() > 0.7;
    
    return {
      ...player,
      kdRatio,
      winRate,
      dailyMeritGain,
      powerGrowthRate,
      daysInactive,
      trend,
      previouslyFlagged,
      improvementPercentage: previouslyFlagged && trend === 'improving' ? Math.floor(Math.random() * 30) + 10 : undefined
    };
  };

  const playerData = useMemo(() => {
    return players.map(transformPlayerData);
  }, [players]);

  // Categorize players based on performance thresholds
  const categorizedPlayers: CategorizedPlayers = useMemo(() => {
    const critical: PlayerPerformanceData[] = [];
    const warning: PlayerPerformanceData[] = [];
    const recovery: PlayerPerformanceData[] = [];

    playerData.forEach(player => {
      // Critical alerts (RED)
      if (
        player.daysInactive >= 48 ||
        player.kdRatio < 1 ||
        player.winRate < 30
      ) {
        critical.push(player);
      }
      // Recovery (GREEN) - previously flagged players now above thresholds
      else if (
        player.previouslyFlagged &&
        player.kdRatio >= thresholds.minKdRatio &&
        player.winRate >= thresholds.minWinRate &&
        player.dailyMeritGain >= thresholds.minDailyMeritGain &&
        player.powerGrowthRate >= thresholds.minPowerGrowthRate
      ) {
        recovery.push(player);
      }
      // Warning alerts (YELLOW)
      else if (
        (player.kdRatio >= 1 && player.kdRatio < thresholds.minKdRatio) ||
        (player.winRate >= 30 && player.winRate < thresholds.minWinRate) ||
        player.dailyMeritGain < thresholds.minDailyMeritGain
      ) {
        warning.push(player);
      }
    });

    return { critical, warning, recovery };
  }, [playerData, thresholds]);

  // Export configurations for different alert levels
  const getExportConfig = (level: AlertLevel) => {
    const baseColumns = [
      { key: 'name', header: 'Player Name', width: 20 },
      { key: 'allianceTag', header: 'Alliance', width: 15 },
      { key: 'currentPower', header: 'Power', width: 15 },
      { key: 'kdRatio', header: 'K/D Ratio', type: 'number' as const, width: 12 },
      { key: 'winRate', header: 'Win Rate (%)', type: 'number' as const, width: 12 },
      { key: 'dailyMeritGain', header: 'Daily Merit Gain', type: 'number' as const, width: 15 },
      { key: 'powerGrowthRate', header: 'Power Growth (%)', type: 'number' as const, width: 15 }
    ];

    if (level === 'critical') {
      baseColumns.push(
        { key: 'daysInactive', header: 'Days Inactive', type: 'number' as const, width: 12 },
        { key: 'recommendedAction', header: 'Recommended Action', width: 25 }
      );
    } else if (level === 'recovery') {
      baseColumns.push(
        { key: 'improvementPercentage', header: 'Improvement %', type: 'number' as const, width: 15 }
      );
    }

    return { columns: baseColumns };
  };

  // Generate recommended actions for players
  const getRecommendedAction = (player: PlayerPerformanceData): string => {
    if (player.daysInactive >= 48) return 'Contact immediately - Extended inactivity';
    if (player.kdRatio < 1) return 'Training needed - Poor battle performance';
    if (player.winRate < 30) return 'Strategy review - Low win rate';
    if (player.dailyMeritGain < 50) return 'Engagement boost - Low merit accumulation';
    return 'Monitor closely';
  };

  // Prepare export data with recommended actions
  const prepareExportData = (players: PlayerPerformanceData[], level: AlertLevel) => {
    return players.map(player => ({
      ...player,
      recommendedAction: level === 'critical' ? getRecommendedAction(player) : undefined
    }));
  };

  const handlePlayerClick = (player: PlayerPerformanceData) => {
    setSelectedPlayer(player);
    onPlayerSelect(player.lordId);
  };

  const AlertCard = ({ 
    level, 
    players, 
    icon: Icon, 
    title, 
    description,
    bgColor,
    borderColor,
    textColor 
  }: {
    level: AlertLevel;
    players: PlayerPerformanceData[];
    icon: React.ElementType;
    title: string;
    description: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
  }) => (
    <Card className={`${bgColor} ${borderColor}`}>
      <CardHeader className="pb-3">
        <CardTitle className={`${textColor} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {title}
            <Badge variant="outline" className={`${textColor} border-current`}>
              {players.length}
            </Badge>
          </div>
          <ExportButton
            data={prepareExportData(players, level)}
            exportConfig={getExportConfig(level)}
            filename={`${level}-performers-${new Date().toISOString().split('T')[0]}`}
            title={`${title} - Performance Report`}
            subtitle={`Generated on ${new Date().toLocaleDateString()}`}
            variant="outline"
            size="sm"
          />
        </CardTitle>
        <p className="text-sm text-gray-300">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {players.length === 0 ? (
            <p className="text-center py-4 text-gray-400">No players in this category</p>
          ) : (
            players.map(player => (
              <div
                key={player.lordId}
                className="p-3 rounded-lg bg-black/20 border border-white/10 cursor-pointer hover:bg-black/30 transition-colors"
                onClick={() => handlePlayerClick(player)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-white">{player.name}</h4>
                    <p className="text-sm text-gray-300">{player.allianceTag}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{parseInt(player.currentPower).toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Power</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-white">
                  <div>
                    <span className="text-gray-400">K/D: </span>
                    <span className={player.kdRatio < 1 ? 'text-red-400' : 'text-white'}>{player.kdRatio.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Win Rate: </span>
                    <span className={player.winRate < 30 ? 'text-red-400' : 'text-white'}>{player.winRate}%</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Merit/Day: </span>
                    <span className={player.dailyMeritGain < 50 ? 'text-red-400' : 'text-white'}>{player.dailyMeritGain}</span>
                  </div>
                  {level === 'critical' && player.daysInactive > 0 && (
                    <div>
                      <span className="text-gray-400">Inactive: </span>
                      <span className="text-red-400">{player.daysInactive}d</span>
                    </div>
                  )}
                  {level === 'recovery' && player.improvementPercentage && (
                    <div>
                      <span className="text-gray-400">Improved: </span>
                      <span className="text-green-400">+{player.improvementPercentage}%</span>
                    </div>
                  )}
                </div>

                {player.trend && (
                  <div className="mt-2 flex items-center gap-1">
                    {player.trend === 'improving' && <TrendingUp className="w-3 h-3 text-green-400" />}
                    {player.trend === 'worsening' && <TrendingDown className="w-3 h-3 text-red-400" />}
                    {player.trend === 'stable' && <Target className="w-3 h-3 text-yellow-400" />}
                    <span className="text-xs text-gray-300 capitalize">{player.trend}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header with Configuration */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-red-400" />
              Worst Performers Tracker
            </div>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure Thresholds
            </button>
          </CardTitle>
        </CardHeader>
        
        {showConfig && (
          <CardContent className="border-t border-gray-700 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Min K/D Ratio
                </label>
                <input
                  type="number"
                  value={thresholds.minKdRatio}
                  onChange={(e) => setThresholds(prev => ({ ...prev, minKdRatio: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Min Win Rate (%)
                </label>
                <input
                  type="number"
                  value={thresholds.minWinRate}
                  onChange={(e) => setThresholds(prev => ({ ...prev, minWinRate: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Min Daily Merit Gain
                </label>
                <input
                  type="number"
                  value={thresholds.minDailyMeritGain}
                  onChange={(e) => setThresholds(prev => ({ ...prev, minDailyMeritGain: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Min Power Growth Rate (%)
                </label>
                <input
                  type="number"
                  value={thresholds.minPowerGrowthRate}
                  onChange={(e) => setThresholds(prev => ({ ...prev, minPowerGrowthRate: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  step="0.1"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-red-900/20 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <div>
                <h3 className="text-lg font-semibold text-red-400">Critical Alerts</h3>
                <p className="text-2xl font-bold text-white">{categorizedPlayers.critical.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-900/20 border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-yellow-400" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-400">Warnings</h3>
                <p className="text-2xl font-bold text-white">{categorizedPlayers.warning.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-900/20 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <div>
                <h3 className="text-lg font-semibold text-green-400">Recovering</h3>
                <p className="text-2xl font-bold text-white">{categorizedPlayers.recovery.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Categories */}
      <Tabs defaultValue="critical" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800">
          <TabsTrigger value="critical" className="data-[state=active]:bg-red-600">
            Critical ({categorizedPlayers.critical.length})
          </TabsTrigger>
          <TabsTrigger value="warning" className="data-[state=active]:bg-yellow-600">
            Warning ({categorizedPlayers.warning.length})
          </TabsTrigger>
          <TabsTrigger value="recovery" className="data-[state=active]:bg-green-600">
            Recovery ({categorizedPlayers.recovery.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="critical">
          <AlertCard
            level="critical"
            players={categorizedPlayers.critical}
            icon={AlertTriangle}
            title="Critical Alerts"
            description="Players requiring immediate attention"
            bgColor="bg-red-900/20"
            borderColor="border-red-500/30"
            textColor="text-red-400"
          />
        </TabsContent>

        <TabsContent value="warning">
          <AlertCard
            level="warning"
            players={categorizedPlayers.warning}
            icon={AlertCircle}
            title="Warning Alerts"
            description="Players to monitor closely"
            bgColor="bg-yellow-900/20"
            borderColor="border-yellow-500/30"
            textColor="text-yellow-400"
          />
        </TabsContent>

        <TabsContent value="recovery">
          <AlertCard
            level="recovery"
            players={categorizedPlayers.recovery}
            icon={CheckCircle}
            title="Recovery Progress"
            description="Previously flagged players showing improvement"
            bgColor="bg-green-900/20"
            borderColor="border-green-500/30"
            textColor="text-green-400"
          />
        </TabsContent>
      </Tabs>

      {/* Historical Tracking Chart */}
      {selectedPlayer && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">
              Performance History - {selectedPlayer.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PlayerProgressChart
              data={[
                {
                  date: '2024-01-01',
                  timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000,
                  merits: parseInt(selectedPlayer.merits) * 0.7,
                  power: parseInt(selectedPlayer.currentPower) * 0.8,
                  unitsKilled: parseInt(selectedPlayer.unitsKilled) * 0.6,
                  victories: selectedPlayer.victories * 0.5,
                  defeats: selectedPlayer.defeats * 0.8,
                  allianceTag: selectedPlayer.allianceTag || undefined
                },
                {
                  date: '2024-01-15',
                  timestamp: Date.now() - 15 * 24 * 60 * 60 * 1000,
                  merits: parseInt(selectedPlayer.merits) * 0.85,
                  power: parseInt(selectedPlayer.currentPower) * 0.9,
                  unitsKilled: parseInt(selectedPlayer.unitsKilled) * 0.8,
                  victories: selectedPlayer.victories * 0.7,
                  defeats: selectedPlayer.defeats * 0.9,
                  allianceTag: selectedPlayer.allianceTag || undefined
                },
                {
                  date: '2024-01-30',
                  timestamp: Date.now(),
                  merits: parseInt(selectedPlayer.merits),
                  power: parseInt(selectedPlayer.currentPower),
                  unitsKilled: parseInt(selectedPlayer.unitsKilled),
                  victories: selectedPlayer.victories,
                  defeats: selectedPlayer.defeats,
                  allianceTag: selectedPlayer.allianceTag || undefined
                }
              ]}
              playerName={selectedPlayer.name}
              playerId={selectedPlayer.lordId}
              metric="merits"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}