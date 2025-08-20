'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ALLIANCE_FILTER_OPTIONS, getManagedAllianceColor, isManagedAlliance, sortAlliancesByPriority } from '@/lib/alliance-config';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  Crown,
  Zap,
  Sword,
  Shield,
  Trophy
} from 'lucide-react';

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

interface LeaderboardTableProps {
  data: LeaderboardData | null;
  loading: boolean;
  onSort: (metric: string) => void;
  onAllianceFilter: (alliance: string) => void;
  onPageChange: (page: number) => void;
  onPlayerClick: (player: Player) => void;
}

const columns = [
  { key: 'rank', label: 'Rank', icon: Crown, sortable: false },
  { key: 'name', label: 'Player', icon: Users, sortable: true },
  { key: 'allianceTag', label: 'Alliance', icon: Shield, sortable: false },
  { key: 'currentPower', label: 'Power', icon: Zap, sortable: true },
  { key: 'merits', label: 'Merits', icon: Trophy, sortable: true },
  { key: 'unitsKilled', label: 'Kills', icon: Sword, sortable: true },
  { key: 'killDeathRatio', label: 'K/D', icon: Sword, sortable: true },
  { key: 'victories', label: 'Wins', icon: Crown, sortable: true },
  { key: 'winRate', label: 'Win %', icon: Trophy, sortable: true },
  { key: 'cityLevel', label: 'Level', icon: Users, sortable: true },
];

export function LeaderboardTable({ 
  data, 
  loading, 
  onSort, 
  onAllianceFilter, 
  onPageChange, 
  onPlayerClick 
}: LeaderboardTableProps) {
  const [selectedColumns, setSelectedColumns] = useState(new Set(['rank', 'name', 'allianceTag', 'currentPower', 'merits', 'unitsKilled']));

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
    return num.toLocaleString();
  };

  const getSortIcon = (column: string) => {
    if (!data || data.sortBy !== column) {
      return <ArrowUpDown className="w-4 h-4 text-gray-500" />;
    }
    return data.order === 'asc' ? 
      <ArrowUp className="w-4 h-4 text-purple-400" /> : 
      <ArrowDown className="w-4 h-4 text-purple-400" />;
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    if (rank === 2) return 'bg-gray-400/20 text-gray-300 border-gray-400/30';
    if (rank === 3) return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    if (rank <= 10) return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    if (rank <= 50) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
  };

  const toggleColumn = (columnKey: string) => {
    const newSelected = new Set(selectedColumns);
    if (newSelected.has(columnKey)) {
      if (newSelected.size > 3) { // Keep at least 3 columns
        newSelected.delete(columnKey);
      }
    } else {
      newSelected.add(columnKey);
    }
    setSelectedColumns(newSelected);
  };

  const visibleColumns = columns.filter(col => selectedColumns.has(col.key));

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.players.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No players found for the current filters</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Alliance Filter */}
        <div className="flex items-center gap-2">
          <select
            value={data.alliance}
            onChange={(e) => onAllianceFilter(e.target.value)}
            className={`px-3 py-2 border rounded text-sm transition-all duration-200 ${
              data.alliance !== 'all' 
                ? 'bg-purple-700 border-purple-500 text-white shadow-lg' 
                : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
            }`}
          >
            {ALLIANCE_FILTER_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            {data.alliances && (
              <optgroup label="All Available Alliances">
                {sortAlliancesByPriority(data.alliances).map(alliance => (
                  <option key={`all-${alliance}`} value={alliance}>
                    {alliance} {isManagedAlliance(alliance) ? '★' : ''}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {data.alliance !== 'all' && (
            <Badge className="bg-purple-600/30 text-purple-200 border-purple-500/50 shadow-lg">
              {data.alliance}
            </Badge>
          )}
        </div>

        {/* Column Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Columns:</span>
          <div className="flex flex-wrap gap-1">
            {columns.map(column => (
              <Button
                key={column.key}
                variant={selectedColumns.has(column.key) ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => toggleColumn(column.key)}
                className={`text-xs transition-all duration-200 ${
                  selectedColumns.has(column.key) 
                    ? 'bg-purple-600 border-purple-500 text-white hover:bg-purple-700 shadow-lg' 
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500'
                }`}
              >
                {column.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>Player Rankings</span>
            <span className="text-sm text-gray-400 font-normal">
              {data.totalPlayers.toLocaleString()} players
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  {visibleColumns.map(column => {
                    const Icon = column.icon;
                    return (
                      <th
                        key={column.key}
                        className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider transition-all duration-200 ${
                          column.sortable ? 'cursor-pointer hover:bg-gray-800' : ''
                        } ${
                          data && data.sortBy === column.key
                            ? 'bg-purple-900/50 text-purple-300 border-b-2 border-purple-500'
                            : 'text-gray-300'
                        }`}
                        onClick={() => column.sortable && onSort(column.key)}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {column.label}
                          {column.sortable && getSortIcon(column.key)}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {data.players.map(player => (
                  <tr
                    key={player.lordId}
                    onClick={() => onPlayerClick(player)}
                    className={`cursor-pointer transition-colors hover:bg-gray-700 ${
                      player.allianceTag && isManagedAlliance(player.allianceTag) 
                        ? 'ring-1 ring-yellow-400/30 bg-gray-800/50' 
                        : ''
                    }`}
                  >
                    {visibleColumns.map(column => (
                      <td key={column.key} className="px-4 py-3 text-sm text-gray-300">
                        {column.key === 'rank' && (
                          <Badge className={getRankBadgeColor(player.rank)}>
                            #{player.rank}
                          </Badge>
                        )}
                        {column.key === 'name' && (
                          <div>
                            <p className="text-white font-medium">{player.name}</p>
                            <p className="text-xs text-gray-400">ID: {player.lordId}</p>
                          </div>
                        )}
                        {column.key === 'allianceTag' && (
                          player.allianceTag ? (
                            <Badge className={`${
                              isManagedAlliance(player.allianceTag) 
                                ? getManagedAllianceColor(player.allianceTag)
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            }`}>
                              {player.allianceTag}
                              {isManagedAlliance(player.allianceTag) && (
                                <span className="ml-1 text-xs">★</span>
                              )}
                            </Badge>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )
                        )}
                        {(column.key === 'currentPower' || column.key === 'merits' || column.key === 'unitsKilled') && (
                          formatNumber(player[column.key])
                        )}
                        {(column.key === 'killDeathRatio' || column.key === 'winRate') && (
                          <span className={
                            typeof player[column.key] === 'number' && (player[column.key] as number) > 1 ? 'text-green-400' :
                            typeof player[column.key] === 'number' && (player[column.key] as number) < 1 ? 'text-red-400' : 'text-gray-300'
                          }>
                            {player[column.key]}
                          </span>
                        )}
                        {(column.key === 'victories' || column.key === 'cityLevel') && (
                          player[column.key].toLocaleString()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Page {data.currentPage} of {data.totalPages} • {data.totalPlayers.toLocaleString()} total players
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={data.currentPage === 1}
              className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(data.currentPage - 1)}
              disabled={data.currentPage === 1}
              className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 py-1 bg-purple-600 border border-purple-500 rounded text-sm text-white font-medium shadow-lg">
              {data.currentPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(data.currentPage + 1)}
              disabled={data.currentPage === data.totalPages}
              className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(data.totalPages)}
              disabled={data.currentPage === data.totalPages}
              className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}