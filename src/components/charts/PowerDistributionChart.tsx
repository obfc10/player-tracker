'use client';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface PowerRange {
  label: string;
  count: number;
}

interface PowerDistributionChartProps {
  data: PowerRange[];
}

export function PowerDistributionChart({ data }: PowerDistributionChartProps) {
  const chartData = {
    labels: data.map(range => range.label),
    datasets: [
      {
        label: 'Number of Players',
        data: data.map(range => range.count),
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderColor: 'rgba(139, 92, 246, 1)',
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
        backgroundColor: '#1F2937',
        titleColor: '#F9FAFB',
        bodyColor: '#D1D5DB',
        borderColor: '#374151',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            return `${context.parsed.y} players`;
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
        },
      },
      y: {
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#D1D5DB',
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="h-80">
      <Bar data={chartData} options={options} />
    </div>
  );
}