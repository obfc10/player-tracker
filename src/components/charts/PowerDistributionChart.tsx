'use client';

import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface PowerDistributionData {
  label: string;
  count: number;
}

interface PowerDistributionChartProps {
  data: PowerDistributionData[];
}

export function PowerDistributionChart({ data }: PowerDistributionChartProps) {
  const chartData = {
    labels: data.map(item => item.label),
    datasets: [
      {
        label: 'Player Count',
        data: data.map(item => item.count),
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
        borderColor: 'rgba(147, 51, 234, 1)',
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
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
            return `Players: ${context.parsed.y}`;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: 'rgba(156, 163, 175, 1)',
          stepSize: 1,
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        title: {
          display: true,
          text: 'Number of Players',
          color: 'rgba(156, 163, 175, 1)',
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
        title: {
          display: true,
          text: 'Power Range',
          color: 'rgba(156, 163, 175, 1)',
        },
      },
    },
  };

  return (
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  );
}