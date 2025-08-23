'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

export function Sparkline({ 
  data, 
  width = 80, 
  height = 20, 
  color = '#22c55e',
  strokeWidth = 1.5,
  className = '' 
}: SparklineProps) {
  if (!data || data.length === 0) {
    return (
      <div 
        className={`bg-gray-700 rounded ${className}`}
        style={{ width, height }}
      />
    );
  }

  const chartData = data.map((value, index) => ({
    index,
    value
  }));

  const trend = data.length > 1 ? data[data.length - 1] - data[0] : 0;
  const sparklineColor = trend > 0 ? '#22c55e' : trend < 0 ? '#ef4444' : '#6b7280';

  return (
    <div className={className} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={sparklineColor}
            strokeWidth={strokeWidth}
            dot={false}
            activeDot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}