'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExportButton } from '@/components/ui/export-button';
import { ExportConfigs } from '@/lib/export';
import {
  GitBranch,
  RefreshCw,
  Users,
  ArrowRight,
  ArrowLeft,
  UserPlus,
  UserMinus,
  Shuffle,
  Calendar,
  TrendingUp,
  Shield,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface AllianceMove {
  id: string;
  playerId: string;
  playerName: string;
  oldAlliance: string | null;
  oldAllianceId: string | null;
  newAlliance: string | null;
  newAllianceId: string | null;
  detectedAt: string;
  moveType: 'joined' | 'left' | 'transferred' | 'unknown';
  currentPower: number;
  cityLevel: number;
  division: number;
}

interface Summary {
  totalMoves: number;
  joins: number;
  leaves: number;
  transfers: number;
  netMovement: number;
  mostActiveAlliances: Array<{
    alliance: string;
    joinCount: number;
  }>;
  timeRange: {
    start: string;
    end: string;
    days: number;
  };
}

interface AllianceMovesData {
  moves: AllianceMove[];
  summary: Summary;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalMoves: number;
    limit: number;
  };
  filters: {
    alliances: string[];
    timeRange: number;
    alliance: string;
    sortBy: string;
    order: string;
  };
}

const timeRanges = [
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 2 weeks' },
  { value: '30', label: 'Last 30 days' },
  { value: '60', label: 'Last 2 months' },
  { value: '90', label: 'Last 3 months' }
];

const sortOptions = [
  { value: 'detectedAt', label: 'Date' },
  { value: 'playerName', label: 'Player Name' },
  { value: 'currentPower', label: 'Power' },
  { value: 'cityLevel', label: 'City Level' }
];

export default function AllianceMovesPage() {
  const router = useRouter();
  const [data, setData] = useState<AllianceMovesData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [timeRange, setTimeRange] = useState('30');
  const [selectedAlliance, setSelectedAlliance] = useState('all');
  const [sortBy, setSortBy] = useState('detectedAt');
  const [order, setOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchAllianceMoves();
  }, [timeRange, selectedAlliance, sortBy, order, currentPage]);

  const fetchAllianceMoves = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        timeRange,
        alliance: selectedAlliance,
        sortBy,
        order,
        page: currentPage.toString(),
        limit: '25'
      });

      const response = await fetch(`/api/alliance-moves?${params}`);
      if (response.ok) {
        const movesData = await response.json();
        setData(movesData);
      }
    } catch (error) {
      console.error('Error fetching alliance moves:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerClick = (move: AllianceMove) => {
    router.push(`/dashboard/player/${move.playerId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const getMoveIcon = (moveType: string) => {
    switch (moveType) {
      case 'joined':
        return <UserPlus className="w-4 h-4 text-green-400" />;
      case 'left':
        return <UserMinus className="w-4 h-4 text-red-400" />;
      case 'transferred':
        return <Shuffle className="w-4 h-4 text-blue-400" />;
      default:
        return <GitBranch className="w-4 h-4 text-gray-400" />;
    }
  };

  const getMoveColor = (moveType: string) => {
    switch (moveType) {
      case 'joined':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'left':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'transferred':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const refresh = () => {
    fetchAllianceMoves();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <GitBranch className="w-8 h-8 text-blue-400" />
              Alliance Moves
            </h1>
            <p className="text-gray-400">
              Track player movements between alliances and analyze migration patterns
            </p>
          </div>
          <div className="flex items-center gap-2">
            {data && data.moves.length > 0 && (
              <ExportButton
                data={data.moves.map(move => ({
                  playerName: move.playerName,
                  fromAlliance: move.oldAlliance || 'No Alliance',
                  toAlliance: move.newAlliance || 'No Alliance',
                  power: move.currentPower,
                  killPoints: 0, // Not available in current data
                  timestamp: move.detectedAt
                }))}
                exportConfig={ExportConfigs.allianceMoves}
                filename={`alliance_moves_${new Date().toISOString().split('T')[0]}`}
                title="Kingdom 671 - Alliance Moves"
                subtitle={`${data.moves.length} alliance moves tracked | Export generated on ${new Date().toLocaleDateString()}`}
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

      {/* Summary Statistics */}
      {data?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Total Moves</p>
                  <p className="text-2xl font-bold text-white">{data.summary.totalMoves}</p>
                  <p className="text-xs text-gray-500">Last {data.summary.timeRange.days} days</p>
                </div>
                <GitBranch className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">New Joins</p>
                  <p className="text-2xl font-bold text-green-400">{data.summary.joins}</p>
                  <p className="text-xs text-gray-500">Players joined alliances</p>
                </div>
                <UserPlus className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Departures</p>
                  <p className="text-2xl font-bold text-red-400">{data.summary.leaves}</p>
                  <p className="text-xs text-gray-500">Players left alliances</p>
                </div>
                <UserMinus className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Transfers</p>
                  <p className="text-2xl font-bold text-blue-400">{data.summary.transfers}</p>
                  <p className="text-xs text-gray-500">Alliance to alliance</p>
                </div>
                <Shuffle className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Time Range</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            >
              {timeRanges.map(range => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
          </CardContent>
        </Card>

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
              {data?.filters.alliances.map(alliance => (
                <option key={alliance} value={alliance}>{alliance}</option>
              ))}
            </select>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Sort By</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Order</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </CardContent>
        </Card>
      </div>

      {/* Most Active Alliances */}
      {data?.summary.mostActiveAlliances && data.summary.mostActiveAlliances.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Most Active Alliances (New Joins)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {data.summary.mostActiveAlliances.map((alliance, index) => (
                <div key={alliance.alliance} className="text-center p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full text-sm font-bold mx-auto mb-2">
                    {index + 1}
                  </div>
                  <p className="text-white font-medium">{alliance.alliance}</p>
                  <p className="text-blue-400 text-sm">{alliance.joinCount} joins</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alliance Moves List */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>Recent Alliance Moves</span>
            {data && (
              <span className="text-sm text-gray-400 font-normal">
                {data.pagination.totalMoves} total moves
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
          ) : data && data.moves.length > 0 ? (
            <div className="space-y-3">
              {data.moves.map((move) => (
                <div
                  key={move.id}
                  onClick={() => handlePlayerClick(move)}
                  className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getMoveIcon(move.moveType)}
                    <div>
                      <p className="text-white font-medium">{move.playerName}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>Level {move.cityLevel}</span>
                        <span>•</span>
                        <span>{formatNumber(move.currentPower)} Power</span>
                        <span>•</span>
                        <span>ID: {move.playerId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-300">
                          {move.oldAlliance || 'No Alliance'}
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-500" />
                        <span className="text-white">
                          {move.newAlliance || 'No Alliance'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getMoveColor(move.moveType)}>
                          {move.moveType}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatDate(move.detectedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No alliance moves found for the selected filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Page {data.pagination.currentPage} of {data.pagination.totalPages} • {data.pagination.totalMoves} total moves
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 py-1 bg-gray-700 rounded text-sm text-white">
              {currentPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(data.pagination.totalPages, currentPage + 1))}
              disabled={currentPage === data.pagination.totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}