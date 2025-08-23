'use client';

import { useEffect, useState } from 'react';
import { useSeason } from '@/contexts/SeasonContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AllianceChart } from '@/components/charts/AllianceChart';
import { PowerDistributionChart } from '@/components/charts/PowerDistributionChart';
import { Users, Shield, Zap, Calendar, TrendingUp, Crown } from 'lucide-react';

interface DashboardStats {
  totalPlayers: number;
  activeAlliances: number;
  totalPower: number;
  lastUpdate: string | null;
  recentUploads: number;
  allianceDistribution: Array<{
    name: string;
    memberCount: number;
    totalPower: number;
  }>;
  topPlayers: Array<{
    lordId: string;
    name: string;
    currentPower: number;
    allianceTag: string | null;
  }>;
  powerDistribution: Array<{
    label: string;
    count: number;
  }>;
  snapshotInfo: {
    kingdom: string;
    filename: string;
    timestamp: string;
  } | null;
}

export default function OverviewPage() {
  const { selectedSeasonMode, selectedSeasonId } = useSeason();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [selectedSeasonMode, selectedSeasonId]);

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams({
        seasonMode: selectedSeasonMode,
        ...(selectedSeasonId && { seasonId: selectedSeasonId })
      });
      const response = await fetch(`/api/dashboard/stats?${params}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          <p>No data available. Please upload Excel files to see statistics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Season Selection */}
      {/* <SeasonSelector /> */}
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Kingdom {stats.snapshotInfo?.kingdom} Overview</h1>
        <p className="text-gray-400">
          Last updated: {formatDate(stats.lastUpdate)} • {stats.snapshotInfo?.filename}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Players</p>
                <p className="text-3xl font-bold text-white">{stats.totalPlayers.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Active Alliances</p>
                <p className="text-3xl font-bold text-white">{stats.activeAlliances}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Kingdom Power</p>
                <p className="text-3xl font-bold text-white">{formatNumber(stats.totalPower)}</p>
              </div>
              <Zap className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Recent Uploads</p>
                <p className="text-3xl font-bold text-white">{stats.recentUploads}</p>
                <p className="text-xs text-gray-500">Last 30 days</p>
              </div>
              <Calendar className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alliance Distribution */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Alliance Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="members" className="space-y-4">
              <TabsList className="bg-gray-700">
                <TabsTrigger value="members">By Members</TabsTrigger>
                <TabsTrigger value="power">By Power</TabsTrigger>
              </TabsList>
              <TabsContent value="members">
                <AllianceChart data={stats.allianceDistribution} type="members" />
              </TabsContent>
              <TabsContent value="power">
                <AllianceChart data={stats.allianceDistribution} type="power" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Power Distribution */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Power Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PowerDistributionChart data={stats.powerDistribution} />
          </CardContent>
        </Card>
      </div>

      {/* Top Players */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Top 10 Players by Power
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.topPlayers.map((player, index) => (
              <div key={player.lordId} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-600 rounded-full text-sm font-bold">
                    {(index + 1).toString()}
                  </div>
                  <div>
                    <p className="text-white font-medium">{player.name}</p>
                    <p className="text-gray-400 text-sm">
                      {player.allianceTag || 'No Alliance'} • ID: {player.lordId}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">{formatNumber(player.currentPower)}</p>
                  <p className="text-gray-400 text-sm">Power</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}