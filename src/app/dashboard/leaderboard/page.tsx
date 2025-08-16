'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSeason } from '@/contexts/SeasonContext';
// import { SeasonSelector } from '@/components/SeasonSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/ui/export-button';
import { ExportConfigs } from '@/lib/export';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { AllianceLeaderboard } from '@/components/leaderboard/AllianceLeaderboard';
import { Trophy, Shield, Users, Crown, RefreshCw } from 'lucide-react';

interface Player {
  rank: number;
  lordId: string;
  name: string;
  currentName: string;
  allianceTag: string | null;
  division: number;
  cityLevel: number;
  faction: string | null;
  currentPower: number;
  unitsKilled: number;
  unitsDead: number;
  unitsHealed: number;
  merits: number;
  victories: number;
  defeats: number;
  killDeathRatio: string | number;
  winRate: string | number;
  helpsGiven: number;
  citySieges: number;
  scouted: number;
  [key: string]: any;
}

interface Alliance {
  rank: number;
  tag: string;
  memberCount: number;
  totalPower: number;
  averagePower: number;
  totalKills: number;
  totalDeaths: number;
  totalMerits: number;
  totalVictories: number;
  totalDefeats: number;
  killDeathRatio: string | number;
  winRate: string | number;
  averageLevel: number;
  topPlayer: {
    name: string;
    power: number;
    lordId?: string;
  };
}

interface LeaderboardData {
  players: Player[];
  totalPlayers: number;
  currentPage: number;
  totalPages: number;
  sortBy: string;
  order: string;
  alliance: string;
  alliances: string[];
  snapshotInfo: {
    id: string;
    timestamp: string;
    kingdom: string;
    filename: string;
  };
}

interface AllianceLeaderboardData {
  alliances: Alliance[];
  totalAlliances: number;
  sortBy: string;
  order: string;
  snapshotInfo: {
    id: string;
    timestamp: string;
    kingdom: string;
    filename: string;
  };
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { selectedSeasonMode, selectedSeasonId } = useSeason();
  const [playerData, setPlayerData] = useState<LeaderboardData | null>(null);
  const [allianceData, setAllianceData] = useState<AllianceLeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('players');
  
  // Player leaderboard state
  const [playerSortBy, setPlayerSortBy] = useState('currentPower');
  const [playerOrder, setPlayerOrder] = useState('desc');
  const [selectedAlliance, setSelectedAlliance] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Alliance leaderboard state
  const [allianceSortBy, setAllianceSortBy] = useState('totalPower');
  const [allianceOrder, setAllianceOrder] = useState('desc');

  useEffect(() => {
    if (activeTab === 'players') {
      fetchPlayerLeaderboard();
    } else {
      fetchAllianceLeaderboard();
    }
  }, [activeTab, playerSortBy, playerOrder, selectedAlliance, currentPage, allianceSortBy, allianceOrder, selectedSeasonMode, selectedSeasonId]);

  const fetchPlayerLeaderboard = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sortBy: playerSortBy,
        order: playerOrder,
        alliance: selectedAlliance,
        page: currentPage.toString(),
        limit: '25',
        seasonMode: selectedSeasonMode,
        ...(selectedSeasonId && { seasonId: selectedSeasonId })
      });

      const response = await fetch(`/api/leaderboard?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPlayerData(data);
      }
    } catch (error) {
      console.error('Error fetching player leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllianceLeaderboard = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sortBy: allianceSortBy,
        order: allianceOrder,
        seasonMode: selectedSeasonMode,
        ...(selectedSeasonId && { seasonId: selectedSeasonId })
      });

      const response = await fetch(`/api/leaderboard/alliances?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAllianceData(data);
      }
    } catch (error) {
      console.error('Error fetching alliance leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerSort = (metric: string) => {
    if (playerSortBy === metric) {
      setPlayerOrder(playerOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setPlayerSortBy(metric);
      setPlayerOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleAllianceSort = (metric: string) => {
    if (allianceSortBy === metric) {
      setAllianceOrder(allianceOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setAllianceSortBy(metric);
      setAllianceOrder('desc');
    }
  };

  const handleAllianceFilter = (alliance: string) => {
    setSelectedAlliance(alliance);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePlayerClick = (player: Player) => {
    // Navigate to player profile page
    router.push(`/dashboard/player/${player.lordId}`);
  };

  const handleAllianceClick = (alliance: Alliance) => {
    // Filter player leaderboard by this alliance
    setActiveTab('players');
    setSelectedAlliance(alliance.tag);
    setCurrentPage(1);
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
    if (activeTab === 'players') {
      fetchPlayerLeaderboard();
    } else {
      fetchAllianceLeaderboard();
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Season Selection */}
      {/* <SeasonSelector /> */}
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-400" />
              Kingdom Leaderboards
            </h1>
            <p className="text-gray-400">
              {playerData?.snapshotInfo || allianceData?.snapshotInfo ? (
                <>
                  Kingdom {(playerData?.snapshotInfo || allianceData?.snapshotInfo)?.kingdom} •
                  Last updated: {formatDate((playerData?.snapshotInfo || allianceData?.snapshotInfo)?.timestamp || '')}
                </>
              ) : (
                'Player and alliance rankings by various metrics'
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'players' && playerData?.players && (
              <ExportButton
                data={playerData.players.map((player, index) => ({
                  rank: player.rank,
                  name: player.name,
                  alliance: player.allianceTag || '',
                  power: player.currentPower,
                  killPoints: player.merits,
                  powerGrowth: 0, // Not available in current data
                  killPointsGrowth: 0 // Not available in current data
                }))}
                exportConfig={ExportConfigs.leaderboard}
                filename={`player_leaderboard_${new Date().toISOString().split('T')[0]}`}
                title="Kingdom 671 - Player Leaderboard"
                subtitle={`Top ${playerData.players.length} players | Export generated on ${new Date().toLocaleDateString()}`}
                variant="outline"
                size="sm"
              />
            )}
            {activeTab === 'alliances' && allianceData?.alliances && (
              <ExportButton
                data={allianceData.alliances.map((alliance, index) => ({
                  rank: alliance.rank,
                  tag: alliance.tag,
                  memberCount: alliance.memberCount,
                  totalPower: alliance.totalPower,
                  averagePower: alliance.averagePower,
                  totalKills: alliance.totalKills,
                  totalDeaths: alliance.totalDeaths,
                  killDeathRatio: alliance.killDeathRatio,
                  winRate: alliance.winRate,
                  topPlayer: alliance.topPlayer.name
                }))}
                exportConfig={{
                  columns: [
                    { key: 'rank', header: 'Rank', type: 'number' as const, width: 8 },
                    { key: 'tag', header: 'Alliance Tag', width: 15 },
                    { key: 'memberCount', header: 'Members', type: 'number' as const, width: 10 },
                    { key: 'totalPower', header: 'Total Power', type: 'number' as const, width: 15 },
                    { key: 'averagePower', header: 'Average Power', type: 'number' as const, width: 15 },
                    { key: 'totalKills', header: 'Total Kills', type: 'number' as const, width: 15 },
                    { key: 'totalDeaths', header: 'Total Deaths', type: 'number' as const, width: 15 },
                    { key: 'killDeathRatio', header: 'K/D Ratio', type: 'number' as const, width: 12 },
                    { key: 'winRate', header: 'Win Rate', type: 'number' as const, width: 12 },
                    { key: 'topPlayer', header: 'Top Player', width: 20 }
                  ]
                }}
                filename={`alliance_leaderboard_${new Date().toISOString().split('T')[0]}`}
                title="Kingdom 671 - Alliance Leaderboard"
                subtitle={`Top ${allianceData.alliances.length} alliances | Export generated on ${new Date().toLocaleDateString()}`}
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

      {/* Leaderboard Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Players</p>
                <p className="text-2xl font-bold text-white">
                  {playerData?.totalPlayers.toLocaleString() || '-'}
                </p>
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
                <p className="text-2xl font-bold text-white">
                  {allianceData?.totalAlliances || playerData?.alliances.length || '-'}
                </p>
              </div>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Top Player Power</p>
                <p className="text-2xl font-bold text-white">
                  {playerData?.players[0] ? 
                    `${(playerData.players[0].currentPower / 1000000).toFixed(1)}M` : 
                    '-'
                  }
                </p>
              </div>
              <Crown className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-800">
          <TabsTrigger value="players" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Player Rankings
          </TabsTrigger>
          <TabsTrigger value="alliances" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Alliance Rankings
          </TabsTrigger>
        </TabsList>

        {/* Player Leaderboard */}
        <TabsContent value="players">
          <LeaderboardTable
            data={playerData}
            loading={loading}
            onSort={handlePlayerSort}
            onAllianceFilter={handleAllianceFilter}
            onPageChange={handlePageChange}
            onPlayerClick={handlePlayerClick}
          />
        </TabsContent>

        {/* Alliance Leaderboard */}
        <TabsContent value="alliances">
          <AllianceLeaderboard
            data={allianceData}
            loading={loading}
            onSort={handleAllianceSort}
            onAllianceClick={handleAllianceClick}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-2">Player Rankings</h4>
              <p className="text-gray-400">
                Sort by power, kills, merits, and other metrics. Click any player to view their progress.
              </p>
            </div>
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-2">Alliance Competition</h4>
              <p className="text-gray-400">
                Compare alliance performance, member counts, and collective achievements.
              </p>
            </div>
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-2">Custom Metrics</h4>
              <p className="text-gray-400">
                Select which metrics to display and customize your leaderboard view.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}