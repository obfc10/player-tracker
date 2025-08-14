'use client';

import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale);

interface AllianceData {
  name: string;
  memberCount: number;
  totalPower: number;
}

interface AllianceChartProps {
  data: AllianceData[];
  type: 'members' | 'power';
}

export function AllianceChart({ data, type }: AllianceChartProps) {
  const colors = [
    '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444',
    '#EC4899', '#84CC16', '#F97316', '#6366F1', '#14B8A6'
  ];

  const chartData = {
    labels: data.map(alliance => alliance.name || 'No Alliance'),
    datasets: [
      {
        data: data.map(alliance => 
          type === 'members' ? alliance.memberCount : alliance.totalPower
        ),
        backgroundColor: colors.slice(0, data.length),
        borderColor: '#1F2937',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#D1D5DB',
          font: {
            size: 12
          },
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: '#1F2937',
        titleColor: '#F9FAFB',
        bodyColor: '#D1D5DB',
        borderColor: '#374151',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            
            if (type === 'members') {
              return `${label}: ${value} members (${percentage}%)`;
            } else {
              return `${label}: ${(value / 1000000).toFixed(1)}M power (${percentage}%)`;
            }
          }
        }
      },
    },
  };

  return (
    <div className="h-80">
      <Pie data={chartData} options={options} />
    </div>
  );
}