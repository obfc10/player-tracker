'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExportButton } from '@/components/ui/export-button';
import { ExportConfigs } from '@/lib/export';
import { ChangesTable } from '@/components/changes/ChangesTable';
import { ChangesSummary } from '@/components/changes/ChangesSummary';
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Sword,
  Trophy,
  Crown,
  Target,
  Users,
  Shield,
  Heart
} from 'lucide-react';

interface Change {
  playerId: string;
  name: string;
  currentName: string;
  allianceTag: string | null;
  division: number;
  cityLevel: number;
  fromValue: number;
  toValue: number;
  change: number;
  percentChange: number;
}

interface Summary {
  totalPlayers: number;
  playersGained: number;
  playersLost: number;
  avgChange: number;
  metric: string;
  compareType: string;
  fromSnapshot: {
    id: string;
    timestamp: string;
    kingdom: string;
    filename: string;
  };
  toSnapshot: {
    id: string;
    timestamp: string;
    kingdom: string;
    filename: string;
  };
}

interface Snapshot {
  id: string;
  timestamp: string;
  kingdom: string;
  filename: string;
}

interface ChangesData {
  gainers: Change[];
  losers: Change[];
  summary: Summary;
  availableSnapshots: Snapshot[];
  alliances: string[];
  alliance: string;
}

const metrics = [
  { key: 'currentPower', label: 'Power', icon: Zap },
  { key: 'merits', label: 'Merits', icon: Trophy },
  { key: 'unitsKilled', label: 'Units Killed', icon: Sword },
  { key: 'unitsDead', label: 'Units Lost', icon: Shield },
  { key: 'victories', label: 'Victories', icon: Crown },
  { key: 'defeats', label: 'Defeats', icon: Heart },
  { key: 'cityLevel', label: 'City Level', icon: Users },
  { key: 'killDeathRatio', label: 'K/D Ratio', icon: Target },
  { key: 'winRate', label: 'Win Rate', icon: Trophy }
];

const compareTypes = [
  { key: 'previous', label: 'Previous Snapshot' },
  { key: 'week', label: 'Past Week' },
  { key: 'custom', label: 'Custom Period' }
];

export default function ChangesPage() {
  const router = useRouter();
  const [data, setData] = useState<ChangesData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [selectedMetric, setSelectedMetric] = useState('currentPower');
  const [compareType, setCompareType] = useState('previous');
  const [selectedAlliance, setSelectedAlliance] = useState('all');
  const [fromSnapshot, setFromSnapshot] = useState('');
  const [toSnapshot, setToSnapshot] = useState('');

  useEffect(() => {
    fetchChangesData();
  }, [selectedMetric, compareType, selectedAlliance, fromSnapshot, toSnapshot]);

  const fetchChangesData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        metric: selectedMetric,
        compareType,
        alliance: selectedAlliance,
        limit: '20'
      });

      if (compareType === 'custom' && fromSnapshot && toSnapshot) {
        params.append('fromDate', fromSnapshot);
        params.append('toDate', toSnapshot);
      }

      const response = await fetch(`/api/changes?${params}`);
      if (response.ok) {
        const changesData = await response.json();
        setData(changesData);
      }
    } catch (error) {
      console.error('Error fetching changes data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMetricChange = (metric: string) => {
    setSelectedMetric(metric);
  };

  const handlePlayerClick = (change: Change) => {
    router.push(`/dashboard/progress?player=${change.playerId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const refresh = () => {
    fetchChangesData();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-purple-400" />
              Changes Analysis
            </h1>
            <p className="text-gray-400">
              Track player progression and compare performance between periods
            </p>
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <ExportButton
                data={[...data.gainers, ...data.losers].map(change => ({
                  playerName: change.currentName || change.name,
                  changeType: change.change > 0 ? 'Gain' : 'Loss',
                  field: selectedMetric,
                  oldValue: change.fromValue,
                  newValue: change.toValue,
                  difference: change.change,
                  timestamp: data.summary.toSnapshot.timestamp
                }))}
                exportConfig={ExportConfigs.changes}
                filename={`changes_analysis_${selectedMetric}_${new Date().toISOString().split('T')[0]}`}
                title={`Kingdom 671 - Changes Analysis (${selectedMetric})`}
                subtitle={`${data.gainers.length + data.losers.length} players tracked | Export generated on ${new Date().toLocaleDateString()}`}
                variant="outline"
                size="sm"
              />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Control Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metric Selection */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Metric to Compare</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {metrics.map(metric => {
                const isSelected = selectedMetric === metric.key;
                const Icon = metric.icon;
                return (
                  <Button
                    key={metric.key}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleMetricChange(metric.key)}
                    className="flex items-center gap-2 text-xs"
                  >
                    <Icon className="w-3 h-3" />
                    {metric.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Time Period Selection */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Comparison Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {compareTypes.map(type => (
                <Button
                  key={type.key}
                  variant={compareType === type.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCompareType(type.key)}
                  className="w-full justify-start"
                >
                  {type.label}
                </Button>
              ))}
              
              {/* Custom Date Selection */}
              {compareType === 'custom' && data && (
                <div className="mt-4 space-y-2">
                  <div>
                    <label className="text-xs text-gray-400">From Snapshot:</label>
                    <select
                      value={fromSnapshot}
                      onChange={(e) => setFromSnapshot(e.target.value)}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                    >
                      <option value="">Select snapshot...</option>
                      {data.availableSnapshots.map(snapshot => (
                        <option key={snapshot.id} value={snapshot.id}>
                          {formatDate(snapshot.timestamp)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">To Snapshot:</label>
                    <select
                      value={toSnapshot}
                      onChange={(e) => setToSnapshot(e.target.value)}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                    >
                      <option value="">Select snapshot...</option>
                      {data.availableSnapshots.map(snapshot => (
                        <option key={snapshot.id} value={snapshot.id}>
                          {formatDate(snapshot.timestamp)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alliance Filter */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Alliance Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={selectedAlliance}
              onChange={(e) => setSelectedAlliance(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            >
              <option value="all">All Alliances</option>
              {data?.alliances.map(alliance => (
                <option key={alliance} value={alliance}>{alliance}</option>
              ))}
            </select>
            {selectedAlliance !== 'all' && (
              <div className="mt-2">
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                  {selectedAlliance}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Statistics */}
      {data?.summary && (
        <ChangesSummary summary={data.summary} loading={loading} />
      )}

      {/* Changes Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Gainers */}
        <ChangesTable
          changes={data?.gainers || []}
          title="Top Gainers"
          type="gainers"
          metric={selectedMetric}
          loading={loading}
          onPlayerClick={handlePlayerClick}
        />

        {/* Top Losers */}
        <ChangesTable
          changes={data?.losers || []}
          title="Top Losers"
          type="losers"
          metric={selectedMetric}
          loading={loading}
          onPlayerClick={handlePlayerClick}
        />
      </div>

      {/* Quick Actions */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Analysis Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                Top Gainers
              </h4>
              <p className="text-gray-400">
                Players with the highest improvements. Click any player to view their detailed progress.
              </p>
            </div>
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                Performance Drops
              </h4>
              <p className="text-gray-400">
                Players with significant decreases. Useful for identifying inactive or struggling players.
              </p>
            </div>
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                Custom Periods
              </h4>
              <p className="text-gray-400">
                Compare specific time periods for detailed trend analysis and seasonal patterns.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}