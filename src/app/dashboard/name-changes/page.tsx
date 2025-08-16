'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExportButton } from '@/components/ui/export-button';
import { ExportConfigs } from '@/lib/export';
import {
  UserCheck,
  RefreshCw,
  Users,
  ArrowRight,
  Search,
  Calendar,
  TrendingUp,
  Shield,
  ChevronLeft,
  ChevronRight,
  Hash,
  Type,
  Zap
} from 'lucide-react';

interface NameChange {
  id: string;
  playerId: string;
  playerCurrentName: string;
  oldName: string;
  newName: string;
  detectedAt: string;
  currentPower: number;
  cityLevel: number;
  division: number;
  allianceTag: string | null;
  nameLength: {
    old: number;
    new: number;
  };
  similarity: number;
}

interface Summary {
  totalChanges: number;
  averageChangesPerDay: number;
  mostActiveChangers: Array<{
    playerId: string;
    playerName: string;
    changeCount: number;
    currentPower: number;
    allianceTag: string | null;
  }>;
  patterns: {
    addedNumbers: number;
    removedNumbers: number;
    addedSpecialChars: number;
    removedSpecialChars: number;
    lengthIncreases: number;
    lengthDecreases: number;
    totalAnalyzed: number;
  };
  timeRange: {
    start: string;
    end: string;
    days: number;
  };
}

interface NameChangesData {
  changes: NameChange[];
  summary: Summary;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalChanges: number;
    limit: number;
  };
  filters: {
    alliances: string[];
    timeRange: number;
    alliance: string;
    sortBy: string;
    order: string;
    search: string;
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
  { value: 'oldName', label: 'Old Name' },
  { value: 'newName', label: 'New Name' },
  { value: 'playerCurrentName', label: 'Current Name' }
];

export default function NameChangesPage() {
  const router = useRouter();
  const [data, setData] = useState<NameChangesData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [timeRange, setTimeRange] = useState('30');
  const [selectedAlliance, setSelectedAlliance] = useState('all');
  const [sortBy, setSortBy] = useState('detectedAt');
  const [order, setOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchNameChanges();
    }, searchTerm ? 500 : 0); // Debounce search

    return () => clearTimeout(delayedSearch);
  }, [timeRange, selectedAlliance, sortBy, order, currentPage, searchTerm]);

  const fetchNameChanges = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        timeRange,
        alliance: selectedAlliance,
        sortBy,
        order,
        page: currentPage.toString(),
        limit: '25',
        search: searchTerm
      });

      const response = await fetch(`/api/name-changes?${params}`);
      if (response.ok) {
        const changesData = await response.json();
        setData(changesData);
      }
    } catch (error) {
      console.error('Error fetching name changes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerClick = (change: NameChange) => {
    router.push(`/dashboard/player/${change.playerId}`);
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

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 80) return 'text-green-400';
    if (similarity >= 50) return 'text-yellow-400';
    if (similarity >= 25) return 'text-orange-400';
    return 'text-red-400';
  };

  const getLengthChangeIcon = (oldLength: number, newLength: number) => {
    if (newLength > oldLength) return <TrendingUp className="w-3 h-3 text-green-400" />;
    if (newLength < oldLength) return <TrendingUp className="w-3 h-3 text-red-400 rotate-180" />;
    return <Hash className="w-3 h-3 text-gray-400" />;
  };

  const refresh = () => {
    fetchNameChanges();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <UserCheck className="w-8 h-8 text-purple-400" />
              Name Changes
            </h1>
            <p className="text-gray-400">
              Track player name history and analyze identity change patterns
            </p>
          </div>
          <div className="flex items-center gap-2">
            {data && data.changes.length > 0 && (
              <ExportButton
                data={data.changes.map(change => ({
                  oldName: change.oldName,
                  newName: change.newName,
                  alliance: change.allianceTag || 'No Alliance',
                  power: change.currentPower,
                  similarity: change.similarity,
                  timestamp: change.detectedAt
                }))}
                exportConfig={ExportConfigs.nameChanges}
                filename={`name_changes_${new Date().toISOString().split('T')[0]}`}
                title="Kingdom 671 - Name Changes"
                subtitle={`${data.changes.length} name changes tracked | Export generated on ${new Date().toLocaleDateString()}`}
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
                  <p className="text-gray-400 text-sm font-medium">Total Changes</p>
                  <p className="text-2xl font-bold text-white">{data.summary.totalChanges}</p>
                  <p className="text-xs text-gray-500">Last {data.summary.timeRange.days} days</p>
                </div>
                <UserCheck className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Daily Average</p>
                  <p className="text-2xl font-bold text-blue-400">{data.summary.averageChangesPerDay}</p>
                  <p className="text-xs text-gray-500">Changes per day</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Length Changes</p>
                  <p className="text-2xl font-bold text-green-400">
                    +{data.summary.patterns.lengthIncreases}
                  </p>
                  <p className="text-xs text-gray-500">
                    -{data.summary.patterns.lengthDecreases} decreased
                  </p>
                </div>
                <Type className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Added Numbers</p>
                  <p className="text-2xl font-bold text-yellow-400">{data.summary.patterns.addedNumbers}</p>
                  <p className="text-xs text-gray-500">
                    -{data.summary.patterns.removedNumbers} removed
                  </p>
                </div>
                <Hash className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Name or Player ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-purple-500 focus:outline-none text-sm"
              />
            </div>
          </CardContent>
        </Card>

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
            <CardTitle className="text-white text-sm">Alliance</CardTitle>
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

      {/* Most Active Name Changers */}
      {data?.summary.mostActiveChangers && data.summary.mostActiveChangers.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Most Active Name Changers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {data.summary.mostActiveChangers.map((changer, index) => (
                <div key={changer.playerId} className="text-center p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-600 rounded-full text-sm font-bold mx-auto mb-2">
                    {(index + 1).toString()}
                  </div>
                  <p className="text-white font-medium truncate">{changer.playerName}</p>
                  <p className="text-purple-400 text-sm">{changer.changeCount} changes</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    {changer.allianceTag && (
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                        {changer.allianceTag}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Name Changes List */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>Recent Name Changes</span>
            {data && (
              <span className="text-sm text-gray-400 font-normal">
                {data.pagination.totalChanges} total changes
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
          ) : data && data.changes.length > 0 ? (
            <div className="space-y-3">
              {data.changes.map((change) => (
                <div
                  key={change.id}
                  onClick={() => handlePlayerClick(change)}
                  className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <UserCheck className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-white font-medium">{change.playerCurrentName}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>Level {change.cityLevel}</span>
                        <span>•</span>
                        <span>{formatNumber(change.currentPower)} Power</span>
                        <span>•</span>
                        <span>ID: {change.playerId}</span>
                        {change.allianceTag && (
                          <>
                            <span>•</span>
                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                              {change.allianceTag}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-300 max-w-32 truncate">
                          {change.oldName}
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-500" />
                        <span className="text-white max-w-32 truncate">
                          {change.newName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          {getLengthChangeIcon(change.nameLength.old, change.nameLength.new)}
                          <span className="text-xs text-gray-500">
                            {change.nameLength.old}→{change.nameLength.new}
                          </span>
                        </div>
                        <span className={`text-xs ${getSimilarityColor(change.similarity)}`}>
                          {change.similarity}% similar
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(change.detectedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No name changes found for the selected filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Page {data.pagination.currentPage} of {data.pagination.totalPages} • {data.pagination.totalChanges} total changes
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