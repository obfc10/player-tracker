import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Line } from 'react-chartjs-2';

interface ActivityTabProps {
  latestSnapshot: any;
  chartData: any;
}

export function ActivityTab({ latestSnapshot, chartData }: ActivityTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Activity Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">Helps Given</span>
              <span className="font-bold text-white">
                {latestSnapshot?.helpsGiven || '0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">City Sieges</span>
              <span className="font-bold text-white">
                {latestSnapshot?.citySieges || '0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Scouted</span>
              <span className="font-bold text-white">
                {latestSnapshot?.scouted || '0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Merits</span>
              <span className="font-bold text-purple-400">
                {latestSnapshot?.merits?.toLocaleString() || '0'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Activity Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData?.activityTrend && (
            <Line data={{
              labels: chartData.activityTrend.map((a: any) => a.date),
              datasets: [
                {
                  label: 'Helps',
                  data: chartData.activityTrend.map((a: any) => a.helps),
                  borderColor: '#10B981',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)'
                },
                {
                  label: 'Sieges',
                  data: chartData.activityTrend.map((a: any) => a.sieges),
                  borderColor: '#F59E0B',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)'
                }
              ]
            }} options={{
              responsive: true,
              plugins: {
                legend: { 
                  position: 'top' as const,
                  labels: {
                    color: '#D1D5DB'
                  }
                }
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