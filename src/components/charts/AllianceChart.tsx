'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

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
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Sort data and take top 10 for better visualization
  const sortedData = [...data]
    .sort((a, b) => type === 'members' ? b.memberCount - a.memberCount : b.totalPower - a.totalPower)
    .slice(0, 10);

  if (!hasMounted) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

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
    return num.toString();
  };

  const chartData = {
    labels: sortedData.map(alliance => alliance.name || 'No Alliance'),
    datasets: [
      {
        label: type === 'members' ? 'Members' : 'Total Power',
        data: sortedData.map(alliance => type === 'members' ? alliance.memberCount : alliance.totalPower),
        backgroundColor: [
          'rgba(147, 51, 234, 0.8)', // Purple
          'rgba(59, 130, 246, 0.8)', // Blue
          'rgba(16, 185, 129, 0.8)', // Green
          'rgba(245, 158, 11, 0.8)', // Yellow
          'rgba(239, 68, 68, 0.8)',  // Red
          'rgba(139, 92, 246, 0.8)', // Violet
          'rgba(6, 182, 212, 0.8)',  // Cyan
          'rgba(34, 197, 94, 0.8)',  // Emerald
          'rgba(251, 146, 60, 0.8)', // Orange
          'rgba(244, 63, 94, 0.8)',  // Rose
        ],
        borderColor: [
          'rgba(147, 51, 234, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(6, 182, 212, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(251, 146, 60, 1)',
          'rgba(244, 63, 94, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: 'rgba(255, 255, 255, 1)',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        borderColor: 'rgba(75, 85, 99, 1)',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y || context.parsed;
            if (type === 'power') {
              return `Power: ${formatNumber(value)}`;
            }
            return `Members: ${value}`;
          }
        }
      },
    },
    scales: type === 'members' ? {
      y: {
        beginAtZero: true,
        ticks: {
          color: 'rgba(156, 163, 175, 1)',
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
      },
      x: {
        ticks: {
          color: 'rgba(156, 163, 175, 1)',
          maxRotation: 45,
        },
        grid: {
          display: false,
        },
      },
    } : undefined,
  };

  if (type === 'power') {
    return (
      <div className="h-64">
        <Pie data={chartData} options={options} />
      </div>
    );
  }

  return (
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  );
}