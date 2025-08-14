'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface ProgressDataPoint {
  timestamp: string;
  currentPower: number;
  merits: number;
  unitsKilled: number;
  unitsDead: number;
  allianceTag?: string | null;
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

export function ProgressChart({ players, metric }: ProgressChartProps) {
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

  const getMetricValue = (point: ProgressDataPoint) => {
    switch (metric) {
      case 'power':
        return point.currentPower;
      case 'merits':
        return point.merits;
      case 'kills':
        return point.unitsKilled;
      case 'deaths':
        return point.unitsDead;
      default:
        return point.currentPower;
    }
  };

  const getMetricLabel = () => {
    switch (metric) {
      case 'power':
        return 'Power';
      case 'merits':
        return 'Merits';
      case 'kills':
        return 'Units Killed';
      case 'deaths':
        return 'Units Dead';
      default:
        return 'Power';
    }
  };

  const getPlayerColor = (index: number) => {
    const colors = [
      'rgba(147, 51, 234, 1)', // Purple
      'rgba(59, 130, 246, 1)', // Blue
      'rgba(16, 185, 129, 1)', // Green
      'rgba(245, 158, 11, 1)', // Yellow
      'rgba(239, 68, 68, 1)',  // Red
    ];
    return colors[index % colors.length];
  };

  if (players.length === 0 || players.every(p => p.snapshots.length === 0)) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p>No data available for the selected time range</p>
          <p className="text-sm mt-2">Try selecting a longer time period or different players</p>
        </div>
      </div>
    );
  }

  // Create datasets for each player
  const datasets = players.map((playerData, index) => {
    const color = getPlayerColor(index);
    return {
      label: playerData.player.currentName,
      data: playerData.snapshots.map(snapshot => ({
        x: new Date(snapshot.timestamp),
        y: getMetricValue(snapshot)
      })),
      borderColor: color,
      backgroundColor: color.replace('1)', '0.1)'),
      borderWidth: 2,
      fill: false,
      tension: 0.4,
      pointBackgroundColor: color,
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
    };
  });

  const chartData = {
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
      title: {
        display: true,
        text: `Player Progress - ${getMetricLabel()} Over Time`,
        color: 'rgba(255, 255, 255, 1)',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: 'rgba(255, 255, 255, 1)',
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: 'rgba(255, 255, 255, 1)',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        borderColor: 'rgba(75, 85, 99, 1)',
        borderWidth: 1,
        callbacks: {
          title: function(context: any) {
            const date = new Date(context[0].parsed.x);
            return date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          },
          label: function(context: any) {
            const value = context.parsed.y;
            const playerName = context.dataset.label;
            return `${playerName}: ${formatNumber(value)} ${getMetricLabel()}`;
          }
        }
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy'
          }
        },
        ticks: {
          color: 'rgba(156, 163, 175, 1)',
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        title: {
          display: true,
          text: 'Date',
          color: 'rgba(156, 163, 175, 1)',
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: 'rgba(156, 163, 175, 1)',
          callback: function(value: any) {
            return formatNumber(value);
          }
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        title: {
          display: true,
          text: getMetricLabel(),
          color: 'rgba(156, 163, 175, 1)',
        },
      },
    },
  };

  return (
    <div className="h-80">
      <Line data={chartData} options={options} />
    </div>
  );
}