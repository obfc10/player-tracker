'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, 
  Calendar, 
  Users, 
  TrendingUp,
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  RefreshCw,
  GitCompare,
  Clock
} from 'lucide-react';

interface Snapshot {
  id: string;
  timestamp: string;
  filename: string;
  kingdom: string;
  playerCount: number;
  displayName: string;
}

interface JoinedPlayerCreation {
  rank: number;
  lordId: string;
  currentName: string;
  joinedAt: string;
  lastSeenAt: string;
  daysSinceJoined: number;
  detectionMethod: 'creation_date';
  currentData: {
    allianceTag: string | null;
    cityLevel: number;
    currentPower: number;
    merits: number;
    victories: number;
    defeats: number;
    division: number;
    snapshotDate: string;
  } | null;
}

interface JoinedPlayerSnapshot {
  rank: number;
  lordId: string;
  currentName: string;
  firstSeenInSnapshot: string;
  detectionMethod: 'snapshot_comparison';
  snapshotData: {
    allianceTag: string | null;
    cityLevel: number;
    currentPower: number;
    merits: number;
    victories: number;
    defeats: number;
    division: number;
    snapshotDate: string;
  } | null;
}

type JoinedPlayer = JoinedPlayerCreation | JoinedPlayerSnapshot;

interface JoinedRealmDataCreation {
  mode: 'creation';
  players: JoinedPlayerCreation[];
  totalPlayers: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  daysAgo: number;
  summary: {
    totalJoined: number;
    recentJoiners: number;
    weeklyJoiners: number;
  };
}

interface JoinedRealmDataSnapshot {
  mode: 'snapshot';
  fromSnapshot: {
    id: string;
    timestamp: string;
    filename: string;
  };
  toSnapshot: {
    id: string;
    timestamp: string;
    filename: string;
  };
  players: JoinedPlayerSnapshot[];
  totalPlayers: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  summary: {
    totalNewPlayers: number;
    comparisonPeriod: {
      from: string;
      to: string;
      daysBetween: number;
    };
  };
}

type JoinedRealmData = JoinedRealmDataCreation | JoinedRealmDataSnapshot;

export default function JoinedRealmPage() {
  const [data, setData] = useState<JoinedRealmData | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [daysAgo, setDaysAgo] = useState(30);
  
  // Mode selection
  const [mode, setMode] = useState<'creation' | 'snapshot'>('creation');
  const [fromSnapshotId, setFromSnapshotId] = useState<string>('');
  const [toSnapshotId, setToSnapshotId] = useState<string>('');

  useEffect(() => {
    fetchSnapshots();
  }, []);

  useEffect(() => {
    if (mode === 'creation' || (mode === 'snapshot' && fromSnapshotId && toSnapshotId)) {
      fetchJoinedRealmData();
    }
  }, [currentPage, daysAgo, mode, fromSnapshotId, toSnapshotId]);

  const fetchSnapshots = async () => {
    setLoadingSnapshots(true);
    try {
      const response = await fetch('/api/snapshots?limit=100');
      if (response.ok) {
        const data = await response.json();
        setSnapshots(data.snapshots);
        
        // Auto-select the two most recent snapshots for comparison
        if (data.snapshots.length >= 2 && !fromSnapshotId && !toSnapshotId) {
          setFromSnapshotId(data.snapshots[1].id); // Second most recent
          setToSnapshotId(data.snapshots[0].id);   // Most recent
        }
      }
    } catch (error) {
      console.error('Error fetching snapshots:', error);
    } finally {
      setLoadingSnapshots(false);
    }
  };

  const fetchJoinedRealmData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '25',
        mode
      });

      if (mode === 'creation') {
        params.append('daysAgo', daysAgo.toString());
      } else if (mode === 'snapshot') {
        if (!fromSnapshotId || !toSnapshotId) {
          setLoading(false);
          return;
        }
        params.append('fromSnapshot', fromSnapshotId);
        params.append('toSnapshot', toSnapshotId);
      }

      const response = await fetch(`/api/players/joined-realm?${params}`);
      if (response.ok) {
        const data = await response.json();
        setData(data);
      }
    } catch (error) {
      console.error('Error fetching joined realm data:', error);
    } finally {
      setLoading(false);
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysSinceJoinedBadge = (days: number) => {
    if (days <= 3) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (days <= 7) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (days <= 14) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    if (days <= 30) return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  if (loading) {
    return (
      <div className="p-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
          </CardContent>
        </Card>
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
              <UserPlus className="w-8 h-8 text-green-400" />
              Players Who Joined Realm
            </h1>
            <p className="text-gray-400">
              Track new players who have recently joined the kingdom
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchJoinedRealmData}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm text-gray-400">Detection Method:</span>
        <div className="flex gap-2">
          <Button
            variant={mode === 'creation' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => {
              setMode('creation');
              setCurrentPage(1);
            }}
            className="flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            By Creation Date
          </Button>
          <Button
            variant={mode === 'snapshot' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => {
              setMode('snapshot');
              setCurrentPage(1);
            }}
            className="flex items-center gap-2"
            disabled={loadingSnapshots || snapshots.length < 2}
          >
            <GitCompare className="w-4 h-4" />
            Compare Snapshots
          </Button>
        </div>
      </div>

      {/* Snapshot Selection (only shown in snapshot mode) */}
      {mode === 'snapshot' && (
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  From Snapshot (Earlier)
                </label>
                <select
                  value={fromSnapshotId}
                  onChange={(e) => {
                    setFromSnapshotId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={loadingSnapshots}
                >
                  <option value="">Select a snapshot...</option>
                  {snapshots.map(snapshot => (
                    <option key={snapshot.id} value={snapshot.id}>
                      {formatDate(snapshot.timestamp)} - {snapshot.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  To Snapshot (Later)
                </label>
                <select
                  value={toSnapshotId}
                  onChange={(e) => {
                    setToSnapshotId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={loadingSnapshots}
                >
                  <option value="">Select a snapshot...</option>
                  {snapshots.map(snapshot => (
                    <option key={snapshot.id} value={snapshot.id}>
                      {formatDate(snapshot.timestamp)} - {snapshot.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">
                    {data.mode === 'creation' ? 'Total Joined' : 'New Players Found'}
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {data.mode === 'creation' ? data.summary.totalJoined.toLocaleString() : data.summary.totalNewPlayers.toLocaleString()}
                  </p>
                </div>
                <UserPlus className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  {data.mode === 'creation' ? (
                    <>
                      <p className="text-gray-400 text-sm font-medium">Recent Joiners</p>
                      <p className="text-2xl font-bold text-white">
                        {data.summary.recentJoiners}
                      </p>
                      <p className="text-xs text-gray-500">Last 7 days</p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-400 text-sm font-medium">Comparison Period</p>
                      <p className="text-2xl font-bold text-white">
                        {data.summary.comparisonPeriod.daysBetween} days
                      </p>
                      <p className="text-xs text-gray-500">Between snapshots</p>
                    </>
                  )}
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">
                    {data.mode === 'creation' ? 'Time Range' : 'Detection Method'}
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {data.mode === 'creation' ? `${data.daysAgo} days` : 'Snapshot'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {data.mode === 'creation' ? 'Creation date based' : 'Comparison based'}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls - only show for creation mode */}
      {mode === 'creation' && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">Show joiners from:</span>
          {[7, 14, 30, 60, 90].map((days) => (
            <Button
              key={days}
              variant={daysAgo === days ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => {
                setDaysAgo(days);
                setCurrentPage(1);
              }}
            >
              {days} days
            </Button>
          ))}
        </div>
      )}

      {/* Players Table */}
      {data && data.players.length > 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>New Players</span>
              <span className="text-sm text-gray-400 font-normal">
                {data.totalPlayers.toLocaleString()} total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Alliance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Power
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      {data.mode === 'creation' ? 'Days Since Joined' : 'Division'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      {data.mode === 'creation' ? 'Joined Date' : 'First Seen'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {data.players.map(player => {
                    const playerData = data.mode === 'creation' 
                      ? (player as JoinedPlayerCreation).currentData
                      : (player as JoinedPlayerSnapshot).snapshotData;
                    
                    return (
                      <tr key={player.lordId} className="hover:bg-gray-700 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-300">
                          <div>
                            <p className="text-white font-medium">{player.currentName}</p>
                            <p className="text-xs text-gray-400">ID: {player.lordId}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {playerData?.allianceTag ? (
                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                              {playerData.allianceTag}
                            </Badge>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {playerData ? 
                            formatNumber(playerData.currentPower) : 
                            <span className="text-gray-500">-</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {playerData?.cityLevel || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {data.mode === 'creation' ? (
                            <Badge className={getDaysSinceJoinedBadge((player as JoinedPlayerCreation).daysSinceJoined)}>
                              {(player as JoinedPlayerCreation).daysSinceJoined} days
                            </Badge>
                          ) : (
                            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                              Div {playerData?.division || '-'}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {data.mode === 'creation' 
                            ? formatDate((player as JoinedPlayerCreation).joinedAt)
                            : formatDate((player as JoinedPlayerSnapshot).firstSeenInSnapshot)
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No new players have joined the realm in the selected time period</p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Page {data.currentPage} of {data.totalPages} • {data.totalPlayers.toLocaleString()} total players
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={data.currentPage === 1}
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(data.currentPage - 1)}
              disabled={data.currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 py-1 bg-gray-700 rounded text-sm text-white">
              {data.currentPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(data.currentPage + 1)}
              disabled={data.currentPage === data.totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(data.totalPages)}
              disabled={data.currentPage === data.totalPages}
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}