'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Zap, Sword, Shield, Trophy } from 'lucide-react';

interface PlayerMetrics {
  powerGrowth: number;
  killsGrowth: number;
  deathsGrowth: number;
  meritsGrowth: number;
  averageDailyPowerGrowth: number;
  killDeathRatio: string | number;
  totalDays: number;
  currentPower: number;
  currentKills: number;
  currentDeaths: number;
  currentMerits: number;
}

interface PlayerProgress {
  player: {
    lordId: string;
    currentName: string;
  };
  metrics: PlayerMetrics | null;
}

interface ProgressMetricsProps {
  players: PlayerProgress[];
}

export function ProgressMetrics({ players }: ProgressMetricsProps) {
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

  const formatGrowth = (growth: number) => {
    const formatted = formatNumber(Math.abs(growth));
    if (growth > 0) return `+${formatted}`;
    if (growth < 0) return `-${formatted}`;
    return formatted;
  };

  const getTrendIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (growth < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getTrendColor = (growth: number) => {
    if (growth > 0) return 'text-green-500';
    if (growth < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  if (players.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center text-gray-400">
          <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select players to view progress metrics</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {players.map((playerProgress) => {
        const { player, metrics } = playerProgress;
        
        if (!metrics) {
          return (
            <Card key={player.lordId} className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">{player.currentName}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Not enough data for progress analysis</p>
              </CardContent>
            </Card>
          );
        }

        return (
          <Card key={player.lordId} className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>{player.currentName}</span>
                <span className="text-sm text-gray-400 font-normal">
                  {metrics.totalDays} days tracked
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Power Growth */}
                <div className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-gray-300">Power</span>
                    </div>
                    {getTrendIcon(metrics.powerGrowth)}
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-bold text-white">
                      {formatNumber(metrics.currentPower)}
                    </p>
                    <p className={`text-sm ${getTrendColor(metrics.powerGrowth)}`}>
                      {formatGrowth(metrics.powerGrowth)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatGrowth(metrics.averageDailyPowerGrowth)}/day
                    </p>
                  </div>
                </div>

                {/* Combat Stats */}
                <div className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Sword className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-gray-300">Combat</span>
                    </div>
                    <span className="text-xs text-gray-400">K/D: {metrics.killDeathRatio}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Kills:</span>
                      <span className="text-green-400">
                        {formatNumber(metrics.currentKills)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Deaths:</span>
                      <span className="text-red-400">
                        {formatNumber(metrics.currentDeaths)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Growth:</span>
                      <span className={getTrendColor(metrics.killsGrowth)}>
                        {formatGrowth(metrics.killsGrowth)} / {formatGrowth(metrics.deathsGrowth)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Merits */}
                <div className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Trophy className="w-4 h-4 text-purple-500" />
                      <span className="text-sm text-gray-300">Merits</span>
                    </div>
                    {getTrendIcon(metrics.meritsGrowth)}
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-bold text-white">
                      {formatNumber(metrics.currentMerits)}
                    </p>
                    <p className={`text-sm ${getTrendColor(metrics.meritsGrowth)}`}>
                      {formatGrowth(metrics.meritsGrowth)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {Math.round(metrics.meritsGrowth / metrics.totalDays)}/day avg
                    </p>
                  </div>
                </div>

                {/* Performance Summary */}
                <div className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-300">Performance</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Efficiency:</span>
                      <span className="text-white">
                        {metrics.killDeathRatio === 'N/A' ? 'N/A' : `${metrics.killDeathRatio}:1`}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Power/Day:</span>
                      <span className={getTrendColor(metrics.averageDailyPowerGrowth)}>
                        {formatNumber(metrics.averageDailyPowerGrowth)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Activity:</span>
                      <span className="text-white">
                        {metrics.totalDays > 0 ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}