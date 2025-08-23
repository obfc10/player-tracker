'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSeason } from '@/contexts/SeasonContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/ui/export-button';
import { ExportConfigs } from '@/lib/export';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { AllianceLeaderboard } from '@/components/leaderboard/AllianceLeaderboard';
import { AllianceComparisonView } from '@/components/leaderboard/AllianceComparisonView';
import { EfficiencyLeaderboard } from '@/components/leaderboard/EfficiencyLeaderboard';
import { ALLIANCE_FILTER_OPTIONS, sortAlliancesByPriority } from '@/lib/alliance-config';
import { useBulkActions } from '@/hooks/useBulkActions';
import { Trophy, Shield, Users, Crown, RefreshCw, Swords, Download, FileBarChart } from 'lucide-react';

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
  data: Player[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  performance: {
    itemCount: number;
    responseSize: number;
    optimized: boolean;
    queryTime: number;
  };
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
  const { isExporting, isGeneratingReport, exportSelectedPlayers, generatePerformanceReport } = useBulkActions();
  const [playerData, setPlayerData] = useState<LeaderboardData | null>(null);
  const [efficiencyData, setEfficiencyData] = useState<any>(null);
  const [allianceData, setAllianceData] = useState<AllianceLeaderboardData | null>(null);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('players');
  const [viewMode, setViewMode] = useState<'individual' | 'comparison' | 'efficiency'>('individual');
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Player leaderboard state
  const [playerSortBy, setPlayerSortBy] = useState('currentPower');
  const [playerOrder, setPlayerOrder] = useState('desc');
  const [selectedAlliance, setSelectedAlliance] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Alliance leaderboard state
  const [allianceSortBy, setAllianceSortBy] = useState('totalPower');
  const [allianceOrder, setAllianceOrder] = useState('desc');

  // Efficiency leaderboard state
  const [efficiencyAlliance, setEfficiencyAlliance] = useState('all');
  const [efficiencyPage, setEfficiencyPage] = useState(1);
  const [allEfficiencyData, setAllEfficiencyData] = useState<any[]>([]);
  const [hasMoreEfficiency, setHasMoreEfficiency] = useState(true);

  useEffect(() => {
    if (activeTab === 'players') {
      if (viewMode === 'comparison') {
        fetchComparisonData();
      } else if (viewMode === 'efficiency') {
        fetchEfficiencyData();
      } else {
        fetchPlayerLeaderboard();
      }
    } else {
      fetchAllianceLeaderboard();
    }
  }, [activeTab, viewMode, selectedSeasonMode, selectedSeasonId, playerSortBy, playerOrder, selectedAlliance, currentPage, allianceSortBy, allianceOrder, efficiencyAlliance]);


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

  const fetchComparisonData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        seasonMode: selectedSeasonMode,
        ...(selectedSeasonId && { seasonId: selectedSeasonId })
      });

      const response = await fetch(`/api/leaderboard/alliance-comparison?${params}`);
      if (response.ok) {
        const data = await response.json();
        setComparisonData(data);
      }
    } catch (error) {
      console.error('Error fetching comparison data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEfficiencyData = async (reset = true) => {
    if (reset) {
      setLoading(true);
      setEfficiencyPage(1);
      setAllEfficiencyData([]);
      setHasMoreEfficiency(true);
    }
    
    try {
      const pageToFetch = reset ? 1 : efficiencyPage;
      const params = new URLSearchParams({
        alliance: efficiencyAlliance,
        page: pageToFetch.toString(),
        limit: '25',
        seasonMode: selectedSeasonMode,
        ...(selectedSeasonId && { seasonId: selectedSeasonId })
      });

      const response = await fetch(`/api/leaderboard/efficiency?${params}`);
      if (response.ok) {
        const data = await response.json();
        
        if (reset) {
          setAllEfficiencyData(data.data);
          setEfficiencyData({
            ...data,
            data: data.data
          });
        } else {
          // Filter out duplicates by lordId when appending
          const existingIds = new Set(allEfficiencyData.map((p: any) => p.lordId));
          const newPlayers = data.data.filter((p: any) => !existingIds.has(p.lordId));
          const combinedData = [...allEfficiencyData, ...newPlayers];
          
          setAllEfficiencyData(combinedData);
          setEfficiencyData({
            ...data,
            data: combinedData
          });
        }
        
        setHasMoreEfficiency(data.pagination.hasNextPage);
      }
    } catch (error) {
      console.error('Error fetching efficiency data:', error);
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

  const handlePlayerClick = (player: Player | any) => {
    // Navigate to player detail page
    router.push(`/dashboard/player/${player.lordId}`);
  };

  const handleAllianceClick = (alliance: Alliance) => {
    // Filter player leaderboard by this alliance
    setActiveTab('players');
    setSelectedAlliance(alliance.tag);
    setCurrentPage(1);
  };

  const handlePlayerSelect = (playerId: string, selected: boolean) => {
    const newSelected = new Set(selectedPlayers);
    if (selected) {
      newSelected.add(playerId);
    } else {
      newSelected.delete(playerId);
    }
    setSelectedPlayers(newSelected);
  };

  const handleEfficiencyAllianceFilter = (alliance: string) => {
    setEfficiencyAlliance(alliance);
    // This will trigger a useEffect to refetch data
  };
  
  // Separate effect for efficiency alliance changes
  useEffect(() => {
    if (viewMode === 'efficiency' && activeTab === 'players') {
      fetchEfficiencyData(true);
    }
  }, [efficiencyAlliance]);

  const handleLoadMoreEfficiency = async () => {
    if (!hasMoreEfficiency || loading) return;
    
    const nextPage = efficiencyPage + 1;
    setEfficiencyPage(nextPage);
    await fetchEfficiencyData(false);
  };

  const handleBulkExport = async () => {
    try {
      await exportSelectedPlayers(Array.from(selectedPlayers), {
        format: 'detailed',
        includeHistory: false
      });
    } catch (error) {
      console.error('Export failed:', error);
      // You could add a toast notification here
    }
  };

  const handleBulkReport = async () => {
    try {
      await generatePerformanceReport(Array.from(selectedPlayers));
    } catch (error) {
      console.error('Report generation failed:', error);
      // You could add a toast notification here
    }
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
      if (viewMode === 'comparison') {
        fetchComparisonData();
      } else if (viewMode === 'efficiency') {
        fetchEfficiencyData();
      } else {
        fetchPlayerLeaderboard();
      }
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
            {activeTab === 'players' && playerData?.data && (
              <ExportButton
                data={playerData.data.map((player, index) => ({
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
                subtitle={`Top ${playerData.data.length} players | Export generated on ${new Date().toLocaleDateString()}`}
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
                  {playerData?.pagination?.totalItems?.toLocaleString() || '-'}
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
                  {playerData?.data?.[0] ? 
                    `${(playerData.data[0].currentPower / 1000000).toFixed(1)}M` : 
                    '-'
                  }
                </p>
              </div>
              <Crown className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Toggle */}
      {activeTab === 'players' && (
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant={viewMode === 'individual' ? 'default' : 'outline'}
              onClick={() => setViewMode('individual')}
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Individual Rankings
            </Button>
            <Button
              variant={viewMode === 'efficiency' ? 'default' : 'outline'}
              onClick={() => setViewMode('efficiency')}
              className="flex items-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              Merit Efficiency
            </Button>
            <Button
              variant={viewMode === 'comparison' ? 'default' : 'outline'}
              onClick={() => setViewMode('comparison')}
              className="flex items-center gap-2"
            >
              <Swords className="w-4 h-4" />
              Alliance Comparison
            </Button>
          </div>
          
          {/* Bulk Actions */}
          {(viewMode === 'individual' || viewMode === 'efficiency') && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                {showBulkActions ? 'Hide' : 'Show'} Bulk Actions
              </Button>
              {showBulkActions && selectedPlayers.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">
                    {selectedPlayers.size} selected
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleBulkExport}
                    disabled={isExporting}
                    className="flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    {isExporting ? 'Exporting...' : 'Export Selected'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleBulkReport}
                    disabled={isGeneratingReport}
                    className="flex items-center gap-1"
                  >
                    <FileBarChart className="w-4 h-4" />
                    {isGeneratingReport ? 'Generating...' : 'Generate Report'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedPlayers(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
          {viewMode === 'individual' ? (
            <LeaderboardTable
              data={playerData}
              loading={loading}
              onSort={handlePlayerSort}
              onAllianceFilter={handleAllianceFilter}
              onPageChange={handlePageChange}
              onPlayerClick={handlePlayerClick}
              selectedPlayers={selectedPlayers}
              onPlayerSelect={handlePlayerSelect}
              showBulkActions={showBulkActions}
            />
          ) : viewMode === 'efficiency' ? (
            <EfficiencyLeaderboard
              data={efficiencyData}
              loading={loading}
              selectedPlayers={selectedPlayers}
              onAllianceFilter={handleEfficiencyAllianceFilter}
              onLoadMore={handleLoadMoreEfficiency}
              hasMore={hasMoreEfficiency}
              onPlayerClick={handlePlayerClick}
              onPlayerSelect={handlePlayerSelect}
              showBulkActions={showBulkActions}
            />
          ) : (
            <AllianceComparisonView
              data={comparisonData}
              loading={loading}
              onRefresh={refresh}
            />
          )}
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
                Sort by power, kills, merits, and other metrics. Click any player to view their ROW event history.
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