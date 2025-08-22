import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HistoryTabProps {
  player: any;
}

export function HistoryTab({ player }: HistoryTabProps) {
  return (
    <div className="space-y-6">
      {player.nameHistory?.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Name History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {player.nameHistory.map((change: any) => (
                <div key={change.id} className="flex justify-between py-2 border-b border-gray-700">
                  <span>
                    <span className="text-gray-400">{change.oldName}</span>
                    {' → '}
                    <span className="text-white">{change.newName}</span>
                  </span>
                  <span className="text-gray-500 text-sm">
                    {new Date(change.detectedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {player.allianceHistory?.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Alliance History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {player.allianceHistory.map((change: any) => (
                <div key={change.id} className="flex justify-between py-2 border-b border-gray-700">
                  <span>
                    <span className="text-gray-400">{change.oldAlliance || 'No Alliance'}</span>
                    {' → '}
                    <span className="text-white">{change.newAlliance || 'No Alliance'}</span>
                  </span>
                  <span className="text-gray-500 text-sm">
                    {new Date(change.detectedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!player.nameHistory?.length && !player.allianceHistory?.length && (
        <div className="text-center py-12">
          <p className="text-gray-400">No history available</p>
        </div>
      )}
    </div>
  );
}