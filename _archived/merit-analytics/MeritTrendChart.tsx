'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isManagedAlliance, MANAGED_ALLIANCES } from '@/lib/alliance-config';
import { TrendingUp } from 'lucide-react';

interface MeritTrendData {
  date: string;
  timestamp: number;
  totalMerits: number;
  alliances: { [key: string]: number };
}

interface MeritTrendChartProps {
  data: MeritTrendData[];
  loading?: boolean;
  selectedAlliance?: string;
}

const ALLIANCE_COLORS = {
  PLAC: '#facc15', // yellow-400
  FLAs: '#fb923c', // orange-400
  Plaf: '#c084fc', // purple-400
  others: '#64748b', // gray-500
  total: '#3b82f6' // blue-500
};

export function MeritTrendChart({ data, loading = false, selectedAlliance = 'all' }: MeritTrendChartProps) {
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
      day: 'numeric'
    });
  };

  const renderLines = () => {
    if (selectedAlliance === 'all') {
      return (
        <>
          <Line 
            type="monotone" 
            dataKey="totalMerits" 
            stroke={ALLIANCE_COLORS.total} 
            strokeWidth={3}
            name="Total Kingdom"
            dot={false}
            activeDot={{ r: 6, stroke: ALLIANCE_COLORS.total, strokeWidth: 2, fill: '#1f2937' }}
          />
          {MANAGED_ALLIANCES.map(alliance => (
            <Line
              key={alliance.tag}
              type="monotone"
              dataKey={`alliances.${alliance.tag}`}
              stroke={ALLIANCE_COLORS[alliance.tag as keyof typeof ALLIANCE_COLORS]}
              strokeWidth={2}
              name={`${alliance.tag} ★`}
              dot={false}
              activeDot={{ r: 4, stroke: ALLIANCE_COLORS[alliance.tag as keyof typeof ALLIANCE_COLORS], strokeWidth: 2, fill: '#1f2937' }}
            />
          ))}
        </>
      );
    } else if (selectedAlliance === 'managed') {
      return MANAGED_ALLIANCES.map(alliance => (
        <Line
          key={alliance.tag}
          type="monotone"
          dataKey={`alliances.${alliance.tag}`}
          stroke={ALLIANCE_COLORS[alliance.tag as keyof typeof ALLIANCE_COLORS]}
          strokeWidth={3}
          name={`${alliance.tag} ★`}
          dot={false}
          activeDot={{ r: 6, stroke: ALLIANCE_COLORS[alliance.tag as keyof typeof ALLIANCE_COLORS], strokeWidth: 2, fill: '#1f2937' }}
        />
      ));
    } else if (isManagedAlliance(selectedAlliance)) {
      return (
        <Line
          type="monotone"
          dataKey={`alliances.${selectedAlliance}`}
          stroke={ALLIANCE_COLORS[selectedAlliance as keyof typeof ALLIANCE_COLORS]}
          strokeWidth={3}
          name={`${selectedAlliance} ★`}
          dot={false}
          activeDot={{ r: 6, stroke: ALLIANCE_COLORS[selectedAlliance as keyof typeof ALLIANCE_COLORS], strokeWidth: 2, fill: '#1f2937' }}
        />
      );
    } else {
      return (
        <Line
          type="monotone"
          dataKey={`alliances.${selectedAlliance}`}
          stroke={ALLIANCE_COLORS.others}
          strokeWidth={3}
          name={selectedAlliance}
          dot={false}
          activeDot={{ r: 6, stroke: ALLIANCE_COLORS.others, strokeWidth: 2, fill: '#1f2937' }}
        />
      );
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Merit Growth Trends
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
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Merit Growth Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center text-gray-400">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No trend data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          Merit Growth Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
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
              <Legend 
                wrapperStyle={{
                  paddingTop: '20px',
                  color: '#d1d5db'
                }}
              />
              {renderLines()}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}