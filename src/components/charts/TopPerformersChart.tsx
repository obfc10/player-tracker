'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { isManagedAlliance } from '@/lib/alliance-config';
import { Trophy, Target, TrendingUp, Crown } from 'lucide-react';
import { useState } from 'react';

interface TopPerformer {
  name: string;
  alliance: string;
  merits: number;
  efficiency: number;
  percentile: number;
  kingdomRank: number;
}

interface TopPerformersChartProps {
  meritLeaders: TopPerformer[];
  efficiencyLeaders: TopPerformer[];
  elitePlayers: TopPerformer[];
  loading?: boolean;
  showTop?: number;
}

type ChartMode = 'merits' | 'efficiency' | 'elite';

const CHART_CONFIG = {
  merits: {
    title: 'Top Merit Leaders',
    icon: Trophy,
    dataKey: 'merits',
    color: '#facc15', // yellow-400
    formatter: (value: number) => {
      if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
      if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
      return value.toLocaleString();
    }
  },
  efficiency: {
    title: 'Top Efficiency Players',
    icon: Target,
    dataKey: 'efficiency',
    color: '#22c55e', // green-500
    formatter: (value: number) => value.toFixed(2) + '%'
  },
  elite: {
    title: 'Kingdom Elite (Top Percentiles)',
    icon: Crown,
    dataKey: 'percentile',
    color: '#8b5cf6', // violet-500
    formatter: (value: number) => value.toFixed(1) + '%'
  }
};

export function TopPerformersChart({ 
  meritLeaders,
  efficiencyLeaders,
  elitePlayers,
  loading = false, 
  showTop = 10 
}: TopPerformersChartProps) {
  const [mode, setMode] = useState<ChartMode>('merits');
  
  const config = CHART_CONFIG[mode];
  const IconComponent = config.icon;

  const getData = () => {
    switch (mode) {
      case 'merits': return meritLeaders?.slice(0, showTop) || [];
      case 'efficiency': return efficiencyLeaders?.slice(0, showTop) || [];
      case 'elite': return elitePlayers?.slice(0, showTop) || [];
      default: return [];
    }
  };

  const data = getData().map((player, index) => ({
    ...player,
    rank: index + 1,
    displayName: player.name.length > 15 ? player.name.substring(0, 15) + '...' : player.name
  }));

  const getBarColor = (alliance: string) => {
    if (isManagedAlliance(alliance)) {
      const colors: { [key: string]: string } = {
        'PLAC': '#facc15', // yellow-400
        'FLAs': '#fb923c', // orange-400
        'Plaf': '#c084fc', // purple-400
      };
      return colors[alliance] || config.color;
    }
    return '#64748b'; // gray-500
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{data.name}</p>
          <div className="flex items-center gap-2 mt-1">
            {data.alliance && (
              <Badge className={`text-xs ${
                isManagedAlliance(data.alliance) 
                  ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' 
                  : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
              }`}>
                {data.alliance}
                {isManagedAlliance(data.alliance) && ' ★'}
              </Badge>
            )}
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
              Rank #{data.kingdomRank}
            </Badge>
          </div>
          <div className="mt-2 space-y-1 text-sm">
            <p className="text-gray-300">
              {config.title.split(' ')[1]}: <span className="text-yellow-400">{config.formatter(data[config.dataKey])}</span>
            </p>
            {mode !== 'merits' && (
              <p className="text-gray-300">
                Merits: <span className="text-yellow-400">{CHART_CONFIG.merits.formatter(data.merits)}</span>
              </p>
            )}
            {mode !== 'efficiency' && (
              <p className="text-gray-300">
                Efficiency: <span className="text-green-400">{CHART_CONFIG.efficiency.formatter(data.efficiency)}</span>
              </p>
            )}
            {mode !== 'elite' && (
              <p className="text-gray-300">
                Percentile: <span className="text-purple-400">{CHART_CONFIG.elite.formatter(data.percentile)}</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <IconComponent className="w-5 h-5 text-yellow-400" />
            {config.title}
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

  if (data.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <IconComponent className="w-5 h-5 text-yellow-400" />
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center text-gray-400">
          <IconComponent className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconComponent className="w-5 h-5 text-yellow-400" />
            {config.title}
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={mode === 'merits' ? 'default' : 'outline'}
              onClick={() => setMode('merits')}
              className="text-xs"
            >
              <Trophy className="w-3 h-3 mr-1" />
              Merits
            </Button>
            <Button
              size="sm"
              variant={mode === 'efficiency' ? 'default' : 'outline'}
              onClick={() => setMode('efficiency')}
              className="text-xs"
            >
              <Target className="w-3 h-3 mr-1" />
              Efficiency
            </Button>
            <Button
              size="sm"
              variant={mode === 'elite' ? 'default' : 'outline'}
              onClick={() => setMode('elite')}
              className="text-xs"
            >
              <Crown className="w-3 h-3 mr-1" />
              Elite
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                type="number"
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickFormatter={config.formatter}
                stroke="#6b7280"
              />
              <YAxis 
                type="category"
                dataKey="displayName"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                stroke="#6b7280"
                width={100}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey={config.dataKey}
                radius={[0, 4, 4, 0]}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getBarColor(entry.alliance)}
                    stroke={isManagedAlliance(entry.alliance) ? '#facc15' : 'transparent'}
                    strokeWidth={isManagedAlliance(entry.alliance) ? 1 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Quick Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">Managed Alliance Players</p>
            <p className="text-lg font-bold text-yellow-400">
              {data.filter(p => isManagedAlliance(p.alliance)).length}
            </p>
          </div>
          <div className="bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">Top Player</p>
            <p className="text-sm font-bold text-green-400">
              {data[0]?.name || 'N/A'}
              {data[0] && isManagedAlliance(data[0].alliance) && ' ★'}
            </p>
          </div>
          <div className="bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">Showing</p>
            <p className="text-lg font-bold text-blue-400">
              Top {data.length}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}