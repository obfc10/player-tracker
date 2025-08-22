import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ResourcesTabProps {
  latestSnapshot: any;
  stats: any;
}

export function ResourcesTab({ latestSnapshot, stats }: ResourcesTabProps) {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Resource Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {['Gold', 'Wood', 'Ore', 'Mana', 'Gems'].map((resource) => {
            const key = resource.toLowerCase();
            const current = parseInt(latestSnapshot?.[key] || '0');
            const spent = parseInt(latestSnapshot?.[`${key}Spent`] || '0');
            
            return (
              <div key={resource} className="text-center p-4 bg-gray-800 rounded">
                <h4 className="font-semibold mb-2 text-white">{resource}</h4>
                <p className="text-2xl font-bold text-green-400">
                  {current.toLocaleString()}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Spent: {spent.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-800 rounded">
            <div className="flex justify-between items-center">
              <span className="text-white">Resource Efficiency</span>
              <span className="text-xl font-bold text-purple-400">
                {stats.resourceEfficiency}%
              </span>
            </div>
          </div>
          <div className="p-4 bg-gray-800 rounded">
            <div className="flex justify-between items-center">
              <span className="text-white">Resources Given</span>
              <span className="font-bold text-blue-400">
                {parseInt(latestSnapshot?.resourcesGiven || '0').toLocaleString()}
              </span>
            </div>
          </div>
          <div className="p-4 bg-gray-800 rounded">
            <div className="flex justify-between items-center">
              <span className="text-white">Donation Count</span>
              <span className="font-bold text-yellow-400">
                {latestSnapshot?.resourcesGivenCount || '0'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}