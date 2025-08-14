'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Zap, Sword, Shield, Award } from 'lucide-react';

interface PlayerMetrics {
  player: {
    lordId: string;
    currentName: string;
  };
  metrics: {
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
  } | null;
}

interface ProgressMetricsProps {
  players: PlayerMetrics[];
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
    return growth >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (growth < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-500';
    if (growth < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  const playersWithMetrics = players.filter(p => p.metrics !== null);

  if (playersWithMetrics.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center text-gray-400">
          <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No metrics available. Players need at least 2 data points to calculate growth.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {playersWithMetrics.map((playerData) => {
        const { player, metrics } = playerData;
        if (!metrics) return null;

        return (
          <Card key={player.lordId} className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-500" />
                {player.currentName}
                <span className="text-sm text-gray-400 font-normal">
                  ({metrics.totalDays} day{metrics.totalDays !== 1 ? 's' : ''} tracked)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Power Metrics */}
                <div className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-gray-400">Power</span>
                    </div>
                    {getGrowthIcon(metrics.powerGrowth)}
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-bold text-white">
                      {formatNumber(metrics.currentPower)}
                    </p>
                    <p className={`text-sm ${getGrowthColor(metrics.powerGrowth)}`}>
                      {formatGrowth(metrics.powerGrowth)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatNumber(metrics.averageDailyPowerGrowth)}/day avg
                    </p>
                  </div>
                </div>

                {/* Combat Kills */}
                <div className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sword className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-gray-400">Kills</span>
                    </div>
                    {getGrowthIcon(metrics.killsGrowth)}
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-bold text-white">
                      {formatNumber(metrics.currentKills)}
                    </p>
                    <p className={`text-sm ${getGrowthColor(metrics.killsGrowth)}`}>
                      {formatGrowth(metrics.killsGrowth)}
                    </p>
                    <p className="text-xs text-gray-500">
                      K/D: {metrics.killDeathRatio}
                    </p>
                  </div>
                </div>

                {/* Combat Deaths */}
                <div className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-gray-400">Deaths</span>
                    </div>
                    {getGrowthIcon(-metrics.deathsGrowth)} {/* Inverted - fewer deaths is better */}
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-bold text-white">
                      {formatNumber(metrics.currentDeaths)}
                    </p>
                    <p className={`text-sm ${getGrowthColor(metrics.deathsGrowth)}`}>
                      {formatGrowth(metrics.deathsGrowth)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {metrics.totalDays > 0 ? formatNumber(Math.round(metrics.deathsGrowth / metrics.totalDays)) : '0'}/day avg
                    </p>
                  </div>
                </div>

                {/* Merits */}
                <div className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-purple-500" />
                      <span className="text-sm text-gray-400">Merits</span>
                    </div>
                    {getGrowthIcon(metrics.meritsGrowth)}
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-bold text-white">
                      {formatNumber(metrics.currentMerits)}
                    </p>
                    <p className={`text-sm ${getGrowthColor(metrics.meritsGrowth)}`}>
                      {formatGrowth(metrics.meritsGrowth)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {metrics.totalDays > 0 ? formatNumber(Math.round(metrics.meritsGrowth / metrics.totalDays)) : '0'}/day avg
                    </p>
                  </div>
                </div>
              </div>

              {/* Performance Summary */}
              <div className="mt-4 p-4 bg-gray-900 rounded-lg">
                <h4 className="text-white font-medium mb-2">Performance Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Growth Rate:</span>
                    <span className={`ml-2 font-medium ${
                      metrics.averageDailyPowerGrowth > 0 ? 'text-green-500' : 
                      metrics.averageDailyPowerGrowth < 0 ? 'text-red-500' : 'text-gray-500'
                    }`}>
                      {metrics.averageDailyPowerGrowth > 0 ? 'Positive' : 
                       metrics.averageDailyPowerGrowth < 0 ? 'Declining' : 'Stable'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Combat Efficiency:</span>
                    <span className={`ml-2 font-medium ${
                      typeof metrics.killDeathRatio === 'number' && metrics.killDeathRatio > 1 ? 'text-green-500' :
                      typeof metrics.killDeathRatio === 'number' && metrics.killDeathRatio < 1 ? 'text-red-500' : 'text-gray-500'
                    }`}>
                      {typeof metrics.killDeathRatio === 'number' && metrics.killDeathRatio > 1 ? 'Excellent' :
                       typeof metrics.killDeathRatio === 'number' && metrics.killDeathRatio < 1 ? 'Needs Improvement' : 'Average'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Activity Level:</span>
                    <span className={`ml-2 font-medium ${
                      metrics.meritsGrowth > 0 ? 'text-green-500' : 
                      metrics.meritsGrowth < 0 ? 'text-red-500' : 'text-gray-500'
                    }`}>
                      {metrics.meritsGrowth > 0 ? 'Active' : 
                       metrics.meritsGrowth < 0 ? 'Declining' : 'Stable'}
                    </span>
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