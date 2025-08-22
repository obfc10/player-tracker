'use client';

import { useEffect, useState } from 'react';
import { useSeason } from '@/contexts/SeasonContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/ui/export-button';
import { PowerDistributionChart } from '@/components/charts/PowerDistributionChart';
import { AllianceChart } from '@/components/charts/AllianceChart';
import { MANAGED_ALLIANCES, getManagedAllianceColor, isManagedAlliance } from '@/lib/alliance-config';
import { 
  Users, 
  Shield, 
  Zap, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Activity,
  Crown,
  RefreshCw,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react';

interface AllianceDashboardData {
  kpis: {
    totalCombinedPower: number;
    powerTrend: number;
    activeMembers: {
      total: number;
      byAlliance: Array<{
        alliance: string;
        count: number;
      }>;
    };
    averageKDRatio: number;
    criticalAlerts: number;
  };
  powerDistribution: {
    allianceBreakdown: Array<{
      alliance: string;
      power: number;
      percentage: number;
    }>;
    powerBrackets: Array<{
      bracket: string;
      count: number;
      players: Array<{
        playerId: string;
        name: string;
        power: number;
      }>;
    }>;
  };
  activityStatus: Array<{
    playerId: string;
    name: string;
    alliance: string;
    power: number;
    lastActive: string;
    status: 'active' | 'low_activity' | 'inactive';
    daysSinceActive: number;
  }>;
  performanceAlerts: {
    plac: Array<{
      playerId: string;
      name: string;
      winRate: number;
      kdRatio: number;
      severity: 'warning' | 'critical';
      issues: string[];
    }>;
    flas: Array<{
      playerId: string;
      name: string;
      winRate: number;
      kdRatio: number;
      severity: 'warning' | 'critical';
      issues: string[];
    }>;
  };
  snapshotInfo: {
    timestamp: string;
    kingdom: string;
    filename: string;
  };
}

type AllianceFilter = 'combined' | 'plac' | 'flas';

export default function AlliancePage() {
  const { selectedSeasonMode, selectedSeasonId } = useSeason();
  const [data, setData] = useState<AllianceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [allianceFilter, setAllianceFilter] = useState<AllianceFilter>('combined');
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);

  useEffect(() => {
    fetchAllianceData();
  }, [selectedSeasonMode, selectedSeasonId, allianceFilter]);

  const fetchAllianceData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        seasonMode: selectedSeasonMode,
        filter: allianceFilter,
        ...(selectedSeasonId && { seasonId: selectedSeasonId })
      });
      
      const response = await fetch(`/api/dashboard/alliance?${params}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching alliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/20';
      case 'low_activity': return 'text-yellow-400 bg-yellow-400/20';
      case 'inactive': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'warning': return 'text-yellow-400 bg-yellow-400/20';
      case 'critical': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const filteredActivityData = data?.activityStatus.filter(player => {
    if (showInactiveOnly) {
      return player.status === 'inactive' || player.status === 'low_activity';
    }
    return true;
  }) || [];

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          <p>No alliance data available. Please upload Excel files to see statistics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Shield className="w-8 h-8 text-purple-400" />
              Alliance Performance Dashboard
            </h1>
            <p className="text-gray-400">
              Kingdom {data.snapshotInfo?.kingdom} • Last updated: {formatDate(data.snapshotInfo?.timestamp)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Alliance Filter */}
            <select
              value={allianceFilter}
              onChange={(e) => setAllianceFilter(e.target.value as AllianceFilter)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded text-sm hover:bg-gray-600"
            >
              <option value="combined">Combined (PLAC + FLAs)</option>
              <option value="plac">PLAC Only</option>
              <option value="flas">FLAs Only</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAllianceData}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Combined Power</p>
                <p className="text-3xl font-bold text-white">{formatNumber(data.kpis.totalCombinedPower)}</p>
                <div className="flex items-center mt-1">
                  {data.kpis.powerTrend >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400 mr-1" />
                  )}
                  <span className={`text-sm ${data.kpis.powerTrend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {data.kpis.powerTrend >= 0 ? '+' : ''}{formatNumber(data.kpis.powerTrend)}
                  </span>
                </div>
              </div>
              <Zap className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Active Members</p>
                <p className="text-3xl font-bold text-white">{data.kpis.activeMembers.total}</p>
                <div className="text-xs text-gray-500 mt-1">
                  {data.kpis.activeMembers.byAlliance.map(alliance => (
                    <div key={alliance.alliance}>
                      {alliance.alliance}: {alliance.count}
                    </div>
                  ))}
                </div>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Average K/D Ratio</p>
                <p className="text-3xl font-bold text-white">{data.kpis.averageKDRatio.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Across both alliances</p>
              </div>
              <Crown className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Critical Alerts</p>
                <p className="text-3xl font-bold text-white">{data.kpis.criticalAlerts}</p>
                <p className="text-xs text-gray-500 mt-1">Inactive + underperformers</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Power Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Power Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="alliance" className="space-y-4">
              <TabsList className="bg-gray-700">
                <TabsTrigger value="alliance">By Alliance</TabsTrigger>
                <TabsTrigger value="brackets">Power Brackets</TabsTrigger>
              </TabsList>
              <TabsContent value="alliance">
                <AllianceChart 
                  data={data.powerDistribution.allianceBreakdown.map(item => ({
                    name: item.alliance,
                    memberCount: 0, // Not used in this view
                    totalPower: item.power
                  }))} 
                  type="power" 
                />
              </TabsContent>
              <TabsContent value="brackets">
                <PowerDistributionChart 
                  data={data.powerDistribution.powerBrackets.map(bracket => ({
                    label: bracket.bracket,
                    count: bracket.count
                  }))} 
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activity Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <p className="text-2xl font-bold text-green-400">
                    {data.activityStatus.filter(p => p.status === 'active').length}
                  </p>
                  <p className="text-sm text-green-300">Active</p>
                </div>
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-400">
                    {data.activityStatus.filter(p => p.status === 'low_activity').length}
                  </p>
                  <p className="text-sm text-yellow-300">Low Activity</p>
                </div>
                <div className="p-3 bg-red-500/20 rounded-lg">
                  <p className="text-2xl font-bold text-red-400">
                    {data.activityStatus.filter(p => p.status === 'inactive').length}
                  </p>
                  <p className="text-sm text-red-300">Inactive</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Status Grid */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Activity Status Grid
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={showInactiveOnly ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowInactiveOnly(!showInactiveOnly)}
                className="flex items-center gap-2"
              >
                {showInactiveOnly ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {showInactiveOnly ? 'Show All' : 'Show Issues Only'}
              </Button>
              <ExportButton
                data={filteredActivityData.map(player => ({
                  name: player.name,
                  alliance: player.alliance,
                  power: player.power,
                  lastActive: player.lastActive,
                  status: player.status,
                  daysSinceActive: player.daysSinceActive
                }))}
                exportConfig={{
                  columns: [
                    { key: 'name', header: 'Player Name', width: 20 },
                    { key: 'alliance', header: 'Alliance', width: 12 },
                    { key: 'power', header: 'Power', type: 'number' as const, width: 15 },
                    { key: 'lastActive', header: 'Last Active', width: 15 },
                    { key: 'status', header: 'Status', width: 12 },
                    { key: 'daysSinceActive', header: 'Days Since Active', type: 'number' as const, width: 15 }
                  ]
                }}
                filename={`alliance_activity_${new Date().toISOString().split('T')[0]}`}
                title="Alliance Activity Status"
                subtitle={`Activity report for ${allianceFilter.toUpperCase()} | Generated on ${new Date().toLocaleDateString()}`}
                variant="outline"
                size="sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Player Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Alliance
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Power
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Last Active
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredActivityData.map(player => (
                  <tr
                    key={player.playerId}
                    className={`hover:bg-gray-700 ${
                      player.status === 'inactive' ? 'bg-red-900/20' :
                      player.status === 'low_activity' ? 'bg-yellow-900/20' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      {player.name}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        isManagedAlliance(player.alliance) 
                          ? getManagedAllianceColor(player.alliance)
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {player.alliance}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {formatNumber(player.power)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {formatDate(player.lastActive)}
                      <div className="text-xs text-gray-500">
                        {player.daysSinceActive} days ago
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(player.status)}`}>
                        {player.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Performance Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              PLAC Performance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.performanceAlerts.plac.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No performance issues detected</p>
              ) : (
                data.performanceAlerts.plac.map(alert => (
                  <div key={alert.playerId} className="p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{alert.name}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300 space-y-1">
                      <div>Win Rate: {alert.winRate.toFixed(1)}% | K/D: {alert.kdRatio.toFixed(2)}</div>
                      <div className="text-xs text-gray-400">
                        Issues: {alert.issues.join(', ')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              FLAs Performance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.performanceAlerts.flas.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No performance issues detected</p>
              ) : (
                data.performanceAlerts.flas.map(alert => (
                  <div key={alert.playerId} className="p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{alert.name}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300 space-y-1">
                      <div>Win Rate: {alert.winRate.toFixed(1)}% | K/D: {alert.kdRatio.toFixed(2)}</div>
                      <div className="text-xs text-gray-400">
                        Issues: {alert.issues.join(', ')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}