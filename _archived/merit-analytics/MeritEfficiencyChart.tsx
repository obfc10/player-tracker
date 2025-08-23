'use client';

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { isManagedAlliance } from '@/lib/alliance-config';
import { Target, Zap } from 'lucide-react';

interface MeritEfficiencyData {
  name: string;
  alliance: string;
  merits: number;
  power: number;
  efficiency: number;
  percentile: number;
}

interface MeritEfficiencyChartProps {
  data: MeritEfficiencyData[];
  loading?: boolean;
  showTop?: number;
}

const ALLIANCE_COLORS: { [key: string]: string } = {
  'PLAC': '#facc15', // yellow-400
  'FLAs': '#fb923c', // orange-400
  'Plaf': '#c084fc', // purple-400
};

export function MeritEfficiencyChart({ 
  data, 
  loading = false, 
  showTop = 50 
}: MeritEfficiencyChartProps) {
  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toLocaleString();
  };

  const formatEfficiency = (value: number) => {
    return value.toFixed(2) + '%';
  };

  const getPointColor = (alliance: string, percentile: number) => {
    if (isManagedAlliance(alliance)) {
      return ALLIANCE_COLORS[alliance] || '#3b82f6';
    }
    // Color code by percentile for non-managed alliances
    if (percentile >= 95) return '#ef4444'; // red-500
    if (percentile >= 90) return '#f97316'; // orange-500
    if (percentile >= 75) return '#eab308'; // yellow-500
    if (percentile >= 50) return '#22c55e'; // green-500
    return '#64748b'; // gray-500
  };

  const processedData = data
    ?.sort((a, b) => b.efficiency - a.efficiency)
    .slice(0, showTop)
    .map(item => ({
      ...item,
      x: item.merits,
      y: item.efficiency,
      color: getPointColor(item.alliance, item.percentile)
    })) || [];

  const CustomTooltip = ({ active, payload }: any) => {
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
          </div>
          <div className="mt-2 space-y-1 text-sm">
            <p className="text-gray-300">
              Merits: <span className="text-yellow-400">{formatNumber(data.merits)}</span>
            </p>
            <p className="text-gray-300">
              Power: <span className="text-blue-400">{formatNumber(data.power)}</span>
            </p>
            <p className="text-gray-300">
              Efficiency: <span className="text-green-400">{formatEfficiency(data.efficiency)}</span>
            </p>
            <p className="text-gray-300">
              Percentile: <span className="text-purple-400">{data.percentile.toFixed(1)}%</span>
            </p>
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
            <Target className="w-5 h-5 text-green-400" />
            Merit Efficiency vs Total Merits
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
            <Target className="w-5 h-5 text-green-400" />
            Merit Efficiency vs Total Merits
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center text-gray-400">
          <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No efficiency data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-green-400" />
            Merit Efficiency vs Total Merits
          </div>
          <span className="text-sm text-gray-400">Top {showTop} Players</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart 
              data={processedData}
              margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                type="number"
                dataKey="x"
                name="Total Merits"
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickFormatter={formatNumber}
                stroke="#6b7280"
              />
              <YAxis 
                type="number"
                dataKey="y"
                name="Efficiency"
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickFormatter={formatEfficiency}
                stroke="#6b7280"
              />
              <Tooltip content={<CustomTooltip />} />
              <Scatter 
                name="Players"
                data={processedData}
                fill="#8884d8"
              >
                {processedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    stroke={isManagedAlliance(entry.alliance) ? '#facc15' : 'transparent'}
                    strokeWidth={isManagedAlliance(entry.alliance) ? 2 : 0}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <span className="text-xs text-gray-400">PLAC ★</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-400"></div>
            <span className="text-xs text-gray-400">FLAs ★</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-400"></div>
            <span className="text-xs text-gray-400">Plaf ★</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span className="text-xs text-gray-400">Others</span>
          </div>
        </div>
        
        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">Avg Efficiency</p>
            <p className="text-lg font-bold text-green-400">
              {data.length > 0 ? formatEfficiency(data.reduce((sum, p) => sum + p.efficiency, 0) / data.length) : '0%'}
            </p>
          </div>
          <div className="bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">Top Efficiency</p>
            <p className="text-lg font-bold text-yellow-400">
              {data.length > 0 ? formatEfficiency(Math.max(...data.map(p => p.efficiency))) : '0%'}
            </p>
          </div>
          <div className="bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">Showing</p>
            <p className="text-lg font-bold text-blue-400">
              {Math.min(showTop, data.length)} players
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}