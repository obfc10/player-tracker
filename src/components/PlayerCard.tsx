// src/components/PlayerCard.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { PlayerProgressChart } from '@/components/charts';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface PlayerCardProps {
  lordId: string;
  onClose?: () => void;
}

export function PlayerCard({ lordId, onClose }: PlayerCardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchPlayerData();
  }, [lordId]);

  const fetchPlayerData = async () => {
    try {
      const response = await fetch(`/api/players/${lordId}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const playerData = await response.json();
      setData(playerData);
    } catch (error) {
      console.error('Error fetching player data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500">Player not found</p>
      </div>
    );
  }

  const { player, latestSnapshot, stats, chartData } = data;

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      {/* Header Section */}
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
                  Data Points: {data.snapshotCount || '0'}
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

      {/* Statistics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="power">Power</TabsTrigger>
          <TabsTrigger value="combat">Combat</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
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
          
          {/* Player Progress Chart */}
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
        </TabsContent>

        {/* Power Tab */}
        <TabsContent value="power">
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
        </TabsContent>

        {/* Combat Tab */}
        <TabsContent value="combat">
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
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources">
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
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
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
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}