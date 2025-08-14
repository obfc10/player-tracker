'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlayerSearch } from '@/components/progress/PlayerSearch';
import { ProgressChart } from '@/components/charts/ProgressChart';
import { ProgressMetrics } from '@/components/progress/ProgressMetrics';
import { TrendingUp, Calendar, BarChart3, Settings } from 'lucide-react';

interface Player {
  lordId: string;
  currentName: string;
  currentPower: number;
  allianceTag: string | null;
  lastSeen: string | null;
}

interface ProgressData {
  timeRange: number;
  players: Array<{
    player: {
      lordId: string;
      currentName: string;
    };
    snapshots: Array<{
      timestamp: string;
      currentPower: number;
      unitsKilled: number;
      unitsDead: number;
      merits: number;
      allianceTag: string | null;
      cityLevel: number;
      victories: number;
      defeats: number;
    }>;
    metrics: {
      powerGrowth: number;
      killsGrowth: number;
      deathsGrowth: number;
      meritsGrowth: number;
      averageDailyPowerGrowth: number;
      killDeathRatio: string | number;
      totalDays: number;
      currentPower: number;
      currentKills: number;
      currentDeaths: number;
      currentMerits: number;
    } | null;
  }>;
}

export default function ProgressPage() {
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('30');
  const [chartMetric, setChartMetric] = useState<'power' | 'kills' | 'deaths' | 'merits'>('power');

  useEffect(() => {
    if (selectedPlayers.length > 0) {
      fetchProgressData();
    } else {
      setProgressData(null);
    }
  }, [selectedPlayers, timeRange]);

  const fetchProgressData = async () => {
    if (selectedPlayers.length === 0) return;

    setLoading(true);
    try {
      const playerIds = selectedPlayers.map(p => p.lordId).join(',');
      const response = await fetch(`/api/progress?players=${playerIds}&timeRange=${timeRange}`);
      
      if (response.ok) {
        const data = await response.json();
        setProgressData(data);
      }
    } catch (error) {
      console.error('Error fetching progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerAdd = (player: Player) => {
    if (selectedPlayers.length < 5 && !selectedPlayers.some(p => p.lordId === player.lordId)) {
      setSelectedPlayers([...selectedPlayers, player]);
    }
  };

  const handlePlayerRemove = (lordId: string) => {
    setSelectedPlayers(selectedPlayers.filter(p => p.lordId !== lordId));
  };

  const getTimeRangeLabel = (days: string) => {
    switch (days) {
      case '7': return 'Last 7 days';
      case '14': return 'Last 2 weeks';
      case '30': return 'Last 30 days';
      case '60': return 'Last 2 months';
      case '90': return 'Last 3 months';
      default: return `Last ${days} days`;
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'power': return 'Power Growth';
      case 'kills': return 'Combat Kills';
      case 'deaths': return 'Unit Deaths';
      case 'merits': return 'Merit Points';
      default: return metric;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-purple-500" />
          Player Progress Tracking
        </h1>
        <p className="text-gray-400">
          Analyze individual player growth and compare performance over time
        </p>
      </div>

      {/* Search and Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player Search */}
        <div className="lg:col-span-2">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Player Selection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PlayerSearch
                selectedPlayers={selectedPlayers}
                onPlayerAdd={handlePlayerAdd}
                onPlayerRemove={handlePlayerRemove}
                maxPlayers={5}
              />
            </CardContent>
          </Card>
        </div>

        {/* Time Range Controls */}
        <div>
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Time Range
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {['7', '14', '30', '60', '90'].map((days) => (
                <Button
                  key={days}
                  variant={timeRange === days ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange(days)}
                  className="w-full justify-start"
                >
                  {getTimeRangeLabel(days)}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Progress Analysis */}
      {selectedPlayers.length > 0 && (
        <Tabs defaultValue="charts" className="space-y-6">
          <TabsList className="bg-gray-800">
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Charts
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Metrics
            </TabsTrigger>
          </TabsList>

          {/* Charts Tab */}
          <TabsContent value="charts">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">
                    Progress Comparison - {getMetricLabel(chartMetric)}
                  </CardTitle>
                  <div className="flex space-x-2">
                    {(['power', 'kills', 'deaths', 'merits'] as const).map((metric) => (
                      <Button
                        key={metric}
                        variant={chartMetric === metric ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setChartMetric(metric)}
                      >
                        {getMetricLabel(metric)}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                  </div>
                ) : progressData ? (
                  <ProgressChart
                    players={progressData.players}
                    metric={chartMetric}
                  />
                ) : (
                  <div className="flex items-center justify-center h-96 text-gray-400">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Select players to view progress charts</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics">
            {loading ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                  </div>
                </CardContent>
              </Card>
            ) : progressData ? (
              <ProgressMetrics players={progressData.players} />
            ) : (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-8 text-center text-gray-400">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select players to view detailed metrics</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {selectedPlayers.length === 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-16 h-16 mx-auto mb-6 text-gray-600" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Track Player Progress
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Search and select up to 5 players to analyze their growth over time. 
              Compare power progression, combat performance, and activity metrics.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-sm text-gray-400">
              <div className="p-4 bg-gray-700 rounded-lg">
                <h4 className="font-medium text-white mb-2">Growth Analysis</h4>
                <p>Track power, kills, deaths, and merit progression over time</p>
              </div>
              <div className="p-4 bg-gray-700 rounded-lg">
                <h4 className="font-medium text-white mb-2">Multi-Player Compare</h4>
                <p>Compare up to 5 players side-by-side with interactive charts</p>
              </div>
              <div className="p-4 bg-gray-700 rounded-lg">
                <h4 className="font-medium text-white mb-2">Time Ranges</h4>
                <p>Analyze data from 7 days to 3 months with flexible time windows</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}