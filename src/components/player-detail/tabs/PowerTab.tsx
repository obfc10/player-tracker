import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pie, Line } from 'react-chartjs-2';

interface PowerTabProps {
  stats: any;
  chartData: any;
}

export function PowerTab({ stats, chartData }: PowerTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Power Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.powerBreakdown && (
            <Pie data={{
              labels: ['Building', 'Hero', 'Legion', 'Tech'],
              datasets: [{
                data: [
                  stats.powerBreakdown.building,
                  stats.powerBreakdown.hero,
                  stats.powerBreakdown.legion,
                  stats.powerBreakdown.tech
                ],
                backgroundColor: [
                  '#3B82F6', // blue
                  '#10B981', // green
                  '#F59E0B', // yellow
                  '#8B5CF6'  // purple
                ]
              }]
            }} options={{
              plugins: {
                legend: {
                  labels: {
                    color: '#D1D5DB' // gray-300 for dark theme
                  }
                }
              }
            }} />
          )}
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Power Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData?.powerTrend && (
            <Line data={{
              labels: chartData.powerTrend.map((p: any) => p.date),
              datasets: [{
                label: 'Power',
                data: chartData.powerTrend.map((p: any) => p.power),
                borderColor: '#8B5CF6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                tension: 0.1
              }]
            }} options={{
              responsive: true,
              plugins: {
                legend: { display: false }
              },
              scales: {
                x: {
                  ticks: { color: '#D1D5DB' },
                  grid: { color: '#374151' }
                },
                y: {
                  ticks: { color: '#D1D5DB' },
                  grid: { color: '#374151' }
                }
              }
            }} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}