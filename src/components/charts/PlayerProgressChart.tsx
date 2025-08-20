'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { isManagedAlliance, getManagedAllianceColor } from '@/lib/alliance-config';
import { User, TrendingUp, Zap, Trophy, Target } from 'lucide-react';

interface PlayerProgressData {
  date: string;
  timestamp: number;
  merits: number;
  power: number;
  unitsKilled: number;
  victories: number;
  defeats: number;
  allianceTag?: string;
  cityLevel?: number;
}

interface PlayerProgressChartProps {
  data: PlayerProgressData[];
  playerName: string;
  playerId: string;
  loading?: boolean;
  metric?: 'merits' | 'power' | 'unitsKilled' | 'victories';
  showDual?: boolean;
}

const METRIC_CONFIG = {
  merits: {
    title: 'Merit Progress',
    dataKey: 'merits',
    color: '#f59e0b', // amber-500
    icon: Trophy
  },
  power: {
    title: 'Power Growth',
    dataKey: 'power', 
    color: '#ef4444', // red-500
    icon: Zap
  },
  unitsKilled: {
    title: 'Units Killed',
    dataKey: 'unitsKilled',
    color: '#8b5cf6', // violet-500
    icon: Target
  },
  victories: {
    title: 'Victory Count',
    dataKey: 'victories',
    color: '#22c55e', // green-500
    icon: Trophy
  }
};

export function PlayerProgressChart({ 
  data, 
  playerName,
  playerId,
  loading = false, 
  metric = 'merits',
  showDual = false
}: PlayerProgressChartProps) {
  const config = METRIC_CONFIG[metric];
  const Icon = config.icon;
  
  const formatNumber = (value: number) => {
    if (value >= 1000000000) {
      return (value / 1000000000).toFixed(1) + 'B';
    }
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: '2-digit'
    });
  };

  const calculateGrowth = () => {
    if (!data || data.length < 2) return { total: 0, percentage: 0 };
    
    const first = data[data.length - 1][metric]; // Oldest
    const last = data[0][metric]; // Most recent
    const total = last - first;
    const percentage = first > 0 ? ((last - first) / first) * 100 : 0;
    
    return { total, percentage };
  };

  const growth = calculateGrowth();
  const currentAlliance = data && data.length > 0 ? data[0].allianceTag : null;

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Icon className="w-5 h-5 text-purple-400" />
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

  if (!data || data.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Icon className="w-5 h-5 text-purple-400" />
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center text-gray-400">
          <Icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No progress data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-purple-400" />
            {config.title}
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
              <User className="w-3 h-3 mr-1" />
              {playerName}
            </Badge>
            {currentAlliance && (
              <Badge className={`text-xs ${
                isManagedAlliance(currentAlliance) 
                  ? getManagedAllianceColor(currentAlliance)
                  : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
              }`}>
                {currentAlliance}
                {isManagedAlliance(currentAlliance) && ' ★'}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {showDual ? (
              <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  tickFormatter={formatDate}
                  stroke="#6b7280"
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  tickFormatter={formatNumber}
                  stroke="#6b7280"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  labelFormatter={(label: any) => `Date: ${(label && typeof label === 'string') ? formatDate(label) : 'Unknown'}`}
                  formatter={(value: number, name: string) => [formatNumber(value), name]}
                />
                <Area 
                  type="monotone"
                  dataKey={config.dataKey}
                  stroke={config.color}
                  fill={config.color}
                  fillOpacity={0.2}
                  strokeWidth={2}
                  name={config.title}
                />
              </AreaChart>
            ) : (
              <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  tickFormatter={formatDate}
                  stroke="#6b7280"
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  tickFormatter={formatNumber}
                  stroke="#6b7280"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  labelFormatter={(label: any) => `Date: ${(label && typeof label === 'string') ? formatDate(label) : 'Unknown'}`}
                  formatter={(value: number, name: string) => [formatNumber(value), name]}
                />
                <Line 
                  type="monotone"
                  dataKey={config.dataKey}
                  stroke={config.color}
                  strokeWidth={3}
                  name={config.title}
                  dot={{ fill: config.color, r: 3 }}
                  activeDot={{ r: 6, stroke: config.color, strokeWidth: 2, fill: '#1f2937' }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
        
        {/* Progress Summary */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">Current</p>
            <p className="text-lg font-bold text-white">
              {data && data.length > 0 ? formatNumber(data[0][metric]) : '-'}
            </p>
          </div>
          <div className="bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">Growth</p>
            <p className={`text-lg font-bold ${growth.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {growth.total >= 0 ? '+' : ''}{formatNumber(growth.total)}
            </p>
          </div>
          <div className="bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">Growth %</p>
            <p className={`text-lg font-bold ${growth.percentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {growth.percentage >= 0 ? '+' : ''}{growth.percentage.toFixed(1)}%
            </p>
          </div>
          <div className="bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">Data Points</p>
            <p className="text-lg font-bold text-blue-400">
              {data?.length || 0}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}