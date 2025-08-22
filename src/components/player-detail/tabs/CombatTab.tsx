import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar } from 'react-chartjs-2';

interface CombatTabProps {
  latestSnapshot: any;
  stats: any;
}

export function CombatTab({ latestSnapshot, stats }: CombatTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Combat Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">Units Killed</span>
              <span className="font-bold text-green-400">
                {latestSnapshot?.unitsKilled?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Units Dead</span>
              <span className="font-bold text-red-400">
                {latestSnapshot?.unitsDead?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Units Healed</span>
              <span className="font-bold text-blue-400">
                {parseInt(latestSnapshot?.unitsHealed || '0').toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Victories</span>
              <span className="font-bold text-white">
                {latestSnapshot?.victories || '0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Defeats</span>
              <span className="font-bold text-white">
                {latestSnapshot?.defeats || '0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Win Rate</span>
              <span className="font-bold text-purple-400">
                {latestSnapshot?.victories && latestSnapshot?.defeats ? 
                  ((latestSnapshot.victories / (latestSnapshot.victories + latestSnapshot.defeats)) * 100).toFixed(1) : 
                  '0'}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Kill Breakdown by Tier</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.killBreakdown && (
            <Bar data={{
              labels: ['T1', 'T2', 'T3', 'T4', 'T5'],
              datasets: [{
                label: 'Kills',
                data: [
                  stats.killBreakdown.t1,
                  stats.killBreakdown.t2,
                  stats.killBreakdown.t3,
                  stats.killBreakdown.t4,
                  stats.killBreakdown.t5
                ],
                backgroundColor: '#8B5CF6'
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