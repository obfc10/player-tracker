import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayerProgressChart } from '@/components/charts';

interface OverviewTabProps {
  stats: any;
  latestSnapshot: any;
  data: any;
  lordId: string;
  loading: boolean;
}

export function OverviewTab({ stats, latestSnapshot, data, lordId, loading }: OverviewTabProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Power Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Daily Average</span>
                <span className="font-bold text-green-400">
                  +{stats.averageDailyGrowth?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Total Growth</span>
                <span className="font-bold text-white">
                  {((latestSnapshot?.currentPower || 0) - 
                    (data.oldestSnapshot?.currentPower || 0)).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Combat Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">K/D Ratio</span>
                <span className="font-bold text-purple-400">
                  {stats.killDeathRatio}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Total Kills</span>
                <span className="font-bold text-green-400">
                  {stats.totalKills?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Total Deaths</span>
                <span className="font-bold text-red-400">
                  {stats.totalDeaths?.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Activity Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Helps/Day</span>
                <span className="font-bold text-white">
                  {stats.activityLevel || '0'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Resource Efficiency</span>
                <span className="font-bold text-white">
                  {stats.resourceEfficiency}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6">
        <PlayerProgressChart 
          data={data?.snapshots?.map((snapshot: any) => ({
            date: snapshot.timestamp,
            timestamp: new Date(snapshot.timestamp).getTime(),
            merits: parseInt(snapshot.merits || '0'),
            power: parseInt(snapshot.currentPower || '0'),
            unitsKilled: parseInt(snapshot.unitsKilled || '0'),
            victories: snapshot.victories || 0,
            defeats: snapshot.defeats || 0,
            allianceTag: snapshot.allianceTag,
            cityLevel: snapshot.cityLevel
          })) || []}
          playerName={data?.player?.currentName || 'Unknown Player'}
          playerId={lordId}
          loading={loading}
          metric="merits"
          showDual={false}
        />
      </div>
    </>
  );
}