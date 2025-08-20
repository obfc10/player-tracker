'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { isManagedAlliance, getManagedAllianceColor, MANAGED_ALLIANCES } from '@/lib/alliance-config';
import { Shield, Star } from 'lucide-react';

interface AlliancePerformance {
  alliance: string;
  totalMerits: number;
  averageMerits: number;
  memberCount: number;
  totalPower: number;
  averagePower: number;
  efficiency: number;
  rank: number;
}

interface AlliancePerformanceChartProps {
  data: AlliancePerformance[];
  loading?: boolean;
  metric?: 'totalMerits' | 'averageMerits' | 'efficiency' | 'totalPower';
  showTop?: number;
}

const CHART_COLORS = {
  PLAC: '#facc15', // yellow-400
  FLAs: '#fb923c', // orange-400
  Plaf: '#c084fc', // purple-400
  default: '#64748b', // gray-500
  highlight: '#3b82f6' // blue-500
};

const METRIC_CONFIG = {
  totalMerits: {
    title: 'Total Alliance Merits',
    dataKey: 'totalMerits',
    color: '#22c55e' // green-500
  },
  averageMerits: {
    title: 'Average Member Merits',
    dataKey: 'averageMerits',
    color: '#f59e0b' // amber-500
  },
  efficiency: {
    title: 'Merit Efficiency (Merits/Power)',
    dataKey: 'efficiency',
    color: '#8b5cf6' // violet-500
  },
  totalPower: {
    title: 'Total Alliance Power',
    dataKey: 'totalPower',
    color: '#ef4444' // red-500
  }
};

export function AlliancePerformanceChart({ 
  data, 
  loading = false, 
  metric = 'totalMerits',
  showTop = 10 
}: AlliancePerformanceChartProps) {
  const config = METRIC_CONFIG[metric];
  
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

  const formatEfficiency = (value: number) => {
    return value.toFixed(3);
  };

  const getBarColor = (alliance: string) => {
    if (isManagedAlliance(alliance)) {
      return CHART_COLORS[alliance as keyof typeof CHART_COLORS] || CHART_COLORS.default;
    }
    return CHART_COLORS.default;
  };

  const processedData = data
    ?.sort((a, b) => b[metric] - a[metric])
    .slice(0, showTop)
    .map(item => ({
      ...item,
      displayName: isManagedAlliance(item.alliance) ? `${item.alliance} ★` : item.alliance
    })) || [];

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
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
            <Shield className="w-5 h-5 text-blue-400" />
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center text-gray-400">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No alliance data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            {config.title}
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs">
              <Star className="w-3 h-3 mr-1" />
              Managed Alliances
            </Badge>
            <span className="text-sm text-gray-400">Top {showTop}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={processedData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              layout="horizontal"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                type="number"
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickFormatter={metric === 'efficiency' ? formatEfficiency : formatNumber}
                stroke="#6b7280"
              />
              <YAxis 
                type="category"
                dataKey="displayName"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                stroke="#6b7280"
                width={80}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value: number) => [
                  metric === 'efficiency' ? formatEfficiency(value) : formatNumber(value),
                  config.title
                ]}
                labelFormatter={(label: any) => `Alliance: ${(label && typeof label === 'string') ? label.replace(' ★', '') : 'Unknown'}`}
              />
              <Bar 
                dataKey={config.dataKey}
                radius={[0, 4, 4, 0]}
              >
                {processedData.map((entry, index) => (
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
        
        {/* Alliance Stats Summary */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">Managed Alliances</p>
            <p className="text-lg font-bold text-yellow-400">
              {data.filter(a => isManagedAlliance(a.alliance)).length}
            </p>
          </div>
          <div className="bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">Total Alliances</p>
            <p className="text-lg font-bold text-white">{data.length}</p>
          </div>
          <div className="bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">Top Alliance</p>
            <p className="text-sm font-bold text-green-400">
              {data[0]?.alliance} {isManagedAlliance(data[0]?.alliance) && '★'}
            </p>
          </div>
          <div className="bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">Showing</p>
            <p className="text-lg font-bold text-blue-400">
              Top {Math.min(showTop, data.length)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}