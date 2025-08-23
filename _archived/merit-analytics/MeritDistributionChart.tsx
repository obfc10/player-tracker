'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { isManagedAlliance } from '@/lib/alliance-config';
import { PieChart as PieChartIcon } from 'lucide-react';

interface MeritDistributionData {
  alliance: string;
  totalMerits: number;
  percentage: number;
  memberCount: number;
}

interface MeritDistributionChartProps {
  data: MeritDistributionData[];
  loading?: boolean;
  showTop?: number;
}

const COLORS = [
  '#facc15', // yellow-400
  '#fb923c', // orange-400  
  '#c084fc', // purple-400
  '#22c55e', // green-500
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
];

export function MeritDistributionChart({ 
  data, 
  loading = false, 
  showTop = 8 
}: MeritDistributionChartProps) {
  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toLocaleString();
  };

  const processedData = data
    ?.sort((a, b) => b.totalMerits - a.totalMerits)
    .slice(0, showTop)
    .map((item, index) => ({
      ...item,
      color: COLORS[index % COLORS.length],
      displayName: isManagedAlliance(item.alliance) ? `${item.alliance} ★` : item.alliance
    })) || [];

  // Calculate "Others" if we're showing less than total data
  const totalMeritsShown = processedData.reduce((sum, item) => sum + item.totalMerits, 0);
  const totalMeritsAll = data?.reduce((sum, item) => sum + item.totalMerits, 0) || 0;
  const othersValue = totalMeritsAll - totalMeritsShown;

  const chartData = [...processedData];
  if (othersValue > 0 && data && data.length > showTop) {
    chartData.push({
      alliance: 'Others',
      displayName: 'Others',
      totalMerits: othersValue,
      percentage: (othersValue / totalMeritsAll) * 100,
      memberCount: data.slice(showTop).reduce((sum, item) => sum + item.memberCount, 0),
      color: '#64748b' // gray-500
    });
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{data.displayName}</p>
          <p className="text-gray-300">
            <span className="text-yellow-400">{formatNumber(data.totalMerits)}</span> merits
          </p>
          <p className="text-gray-300">
            <span className="text-blue-400">{data.percentage.toFixed(1)}%</span> of total
          </p>
          <p className="text-gray-300">
            <span className="text-green-400">{data.memberCount}</span> members
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {payload?.map((entry: any, index: number) => (
          <Badge 
            key={index}
            className="bg-gray-700 text-gray-200 border-gray-600 text-xs"
            style={{ borderLeftColor: entry.color, borderLeftWidth: '3px' }}
          >
            {entry.payload.displayName}
            {isManagedAlliance(entry.payload.alliance) && ' ★'}
          </Badge>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-purple-400" />
            Merit Distribution by Alliance
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
            <PieChartIcon className="w-5 h-5 text-purple-400" />
            Merit Distribution by Alliance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center text-gray-400">
          <PieChartIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No distribution data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-purple-400" />
            Merit Distribution by Alliance
          </div>
          <span className="text-sm text-gray-400">Top {showTop} Alliances</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percentage }) => `${percentage.toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="totalMerits"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    stroke={isManagedAlliance(entry.alliance) ? '#facc15' : 'transparent'}
                    strokeWidth={isManagedAlliance(entry.alliance) ? 2 : 0}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}