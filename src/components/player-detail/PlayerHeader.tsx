import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PlayerHeaderProps {
  player: any;
  latestSnapshot: any;
  stats: any;
  snapshotCount: number;
}

export function PlayerHeader({ player, latestSnapshot, stats, snapshotCount }: PlayerHeaderProps) {
  return (
    <Card className="mb-6 bg-gradient-to-r from-purple-900 to-purple-700">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-3xl text-white mb-2">
              {player.currentName}
            </CardTitle>
            <div className="space-y-1">
              <p className="text-gray-200">Lord ID: {player.lordId}</p>
              <p className="text-gray-200">
                Alliance: {latestSnapshot?.allianceTag || 'No Alliance'}
              </p>
              <p className="text-gray-200">
                Division: {latestSnapshot?.division || 'Unknown'}
              </p>
              <p className="text-gray-200">
                City Level: {latestSnapshot?.cityLevel || '0'}
              </p>
              <p className="text-gray-200">
                Faction: {latestSnapshot?.faction || 'None'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-yellow-400">
              {latestSnapshot?.currentPower?.toLocaleString() || '0'}
            </div>
            <p className="text-gray-200">Current Power</p>
            <div className="mt-4 space-y-1">
              <p className="text-sm text-gray-300">
                Days Tracked: {stats.daysTracked || '0'}
              </p>
              <p className="text-sm text-gray-300">
                Data Points: {snapshotCount || '0'}
              </p>
              <p className="text-sm text-gray-300">
                Last Update: {latestSnapshot ? 
                  new Date(latestSnapshot.snapshot.timestamp).toLocaleString() : 
                  'Never'}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}