'use client';

import { useEffect, useState } from 'react';
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

import { PlayerHeader } from './PlayerHeader';
import {
  OverviewTab,
  PowerTab,
  CombatTab,
  ResourcesTab,
  ActivityTab,
  HistoryTab
} from './tabs';

// Register Chart.js components
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

interface PlayerDetailCardProps {
  lordId: string;
  onClose?: () => void;
}

export function PlayerDetailCard({ lordId, onClose }: PlayerDetailCardProps) {
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
      <PlayerHeader
        player={player}
        latestSnapshot={latestSnapshot}
        stats={stats}
        snapshotCount={data.snapshotCount}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="power">Power</TabsTrigger>
          <TabsTrigger value="combat">Combat</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            stats={stats}
            latestSnapshot={latestSnapshot}
            data={data}
            lordId={lordId}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="power">
          <PowerTab stats={stats} chartData={chartData} />
        </TabsContent>

        <TabsContent value="combat">
          <CombatTab latestSnapshot={latestSnapshot} stats={stats} />
        </TabsContent>

        <TabsContent value="resources">
          <ResourcesTab latestSnapshot={latestSnapshot} stats={stats} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTab latestSnapshot={latestSnapshot} chartData={chartData} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab player={player} />
        </TabsContent>
      </Tabs>
    </div>
  );
}