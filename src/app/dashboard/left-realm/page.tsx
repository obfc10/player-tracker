'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  UserX, 
  Calendar, 
  Users, 
  TrendingDown,
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  RefreshCw
} from 'lucide-react';

interface LeftPlayer {
  rank: number;
  lordId: string;
  currentName: string;
  hasLeftRealm: boolean;
  lastSeenAt: string;
  leftRealmAt: string;
  daysGone: number;
  lastKnownData: {
    allianceTag: string | null;
    cityLevel: number;
    currentPower: number;
    merits: number;
    victories: number;
    defeats: number;
    snapshotDate: string;
  } | null;
}

interface LeftRealmData {
  players: LeftPlayer[];
  totalPlayers: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  daysAgo: number;
  summary: {
    totalLeft: number;
    recentDepartures: number;
    weeklyDepartures: number;
  };
}

export default function LeftRealmPage() {
  const [data, setData] = useState<LeftRealmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [daysAgo, setDaysAgo] = useState(30);

  useEffect(() => {
    fetchLeftRealmData();
  }, [currentPage, daysAgo]);

  const fetchLeftRealmData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '25',
        daysAgo: daysAgo.toString()
      });

      const response = await fetch(`/api/players/left-realm?${params}`);
      if (response.ok) {
        const data = await response.json();
        setData(data);
      }
    } catch (error) {
      console.error('Error fetching left realm data:', error);
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

  const getDaysGoneBadge = (days: number) => {
    if (days <= 7) return 'bg-red-500/20 text-red-300 border-red-500/30';
    if (days <= 14) return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    if (days <= 30) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
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
              <UserX className="w-8 h-8 text-red-400" />
              Players Who Left Realm
            </h1>
            <p className="text-gray-400">
              Track players who have departed from the kingdom
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLeftRealmData}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Total Departed</p>
                  <p className="text-2xl font-bold text-white">
                    {data.summary.totalLeft.toLocaleString()}
                  </p>
                </div>
                <UserX className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Recent Departures</p>
                  <p className="text-2xl font-bold text-white">
                    {data.summary.recentDepartures}
                  </p>
                  <p className="text-xs text-gray-500">Last 7 days</p>
                </div>
                <TrendingDown className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Time Range</p>
                  <p className="text-2xl font-bold text-white">
                    {data.daysAgo} days
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400">Show departures from:</span>
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

      {/* Players Table */}
      {data && data.players.length > 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Departed Players</span>
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
                      Last Power
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Days Since Last Seen
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Detected Left
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {data.players.map(player => (
                    <tr key={player.lordId} className="hover:bg-gray-700 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-300">
                        <div>
                          <p className="text-white font-medium">{player.currentName}</p>
                          <p className="text-xs text-gray-400">ID: {player.lordId}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {player.lastKnownData?.allianceTag ? (
                          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                            {player.lastKnownData.allianceTag}
                          </Badge>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {player.lastKnownData ? 
                          formatNumber(player.lastKnownData.currentPower) : 
                          <span className="text-gray-500">-</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        <Badge className={getDaysGoneBadge(player.daysGone)}>
                          {player.daysGone} days
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {formatDate(player.leftRealmAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No players have left the realm in the selected time period</p>
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