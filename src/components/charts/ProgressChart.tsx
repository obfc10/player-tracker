'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ProgressDataPoint {
  timestamp: string;
  currentPower: number;
  unitsKilled: number;
  unitsDead: number;
  merits: number;
}

interface PlayerProgress {
  player: {
    lordId: string;
    currentName: string;
  };
  snapshots: ProgressDataPoint[];
}

interface ProgressChartProps {
  players: PlayerProgress[];
  metric: 'power' | 'kills' | 'deaths' | 'merits';
}

const colors = [
  '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444',
  '#EC4899', '#84CC16', '#F97316', '#6366F1', '#14B8A6'
];

export function ProgressChart({ players, metric }: ProgressChartProps) {
  const getMetricValue = (snapshot: ProgressDataPoint) => {
    switch (metric) {
      case 'power':
        return snapshot.currentPower;
      case 'kills':
        return snapshot.unitsKilled;
      case 'deaths':
        return snapshot.unitsDead;
      case 'merits':
        return snapshot.merits;
      default:
        return 0;
    }
  };

  const getMetricLabel = () => {
    switch (metric) {
      case 'power':
        return 'Power';
      case 'kills':
        return 'Units Killed';
      case 'deaths':
        return 'Units Dead';
      case 'merits':
        return 'Merits';
      default:
        return '';
    }
  };

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
    return value.toString();
  };

  // Create all unique timestamps from all players
  const allTimestamps = new Set<string>();
  players.forEach(player => {
    player.snapshots.forEach(snapshot => {
      allTimestamps.add(new Date(snapshot.timestamp).toLocaleDateString());
    });
  });
  
  const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  const datasets = players.map((player, index) => {
    const color = colors[index % colors.length];
    
    // Create data points for each timestamp
    const data = sortedTimestamps.map(timestamp => {
      const snapshot = player.snapshots.find(s => 
        new Date(s.timestamp).toLocaleDateString() === timestamp
      );
      return snapshot ? getMetricValue(snapshot) : null;
    });

    return {
      label: player.player.currentName,
      data,
      borderColor: color,
      backgroundColor: color + '20',
      tension: 0.1,
      spanGaps: true,
      pointRadius: 4,
      pointHoverRadius: 6,
    };
  });

  const chartData = {
    labels: sortedTimestamps,
    datasets
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#D1D5DB',
          font: {
            size: 12
          },
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
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${formatNumber(value)}`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#D1D5DB',
          maxTicksLimit: 10,
        },
      },
      y: {
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#D1D5DB',
          callback: function(value: any) {
            return formatNumber(value);
          }
        },
      },
    },
  };

  return (
    <div className="h-96">
      <Line data={chartData} options={options} />
    </div>
  );
}