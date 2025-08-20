'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getManagedAllianceColor, isManagedAlliance } from '@/lib/alliance-config';
import { 
  Shield,
  Users,
  Zap,
  Sword,
  Trophy,
  Crown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Target
} from 'lucide-react';

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

interface AllianceLeaderboardProps {
  data: AllianceLeaderboardData | null;
  loading: boolean;
  onSort: (metric: string) => void;
  onAllianceClick: (alliance: Alliance) => void;
}

const columns = [
  { key: 'rank', label: 'Rank', icon: Crown, sortable: false },
  { key: 'tag', label: 'Alliance', icon: Shield, sortable: true },
  { key: 'memberCount', label: 'Members', icon: Users, sortable: true },
  { key: 'totalPower', label: 'Total Power', icon: Zap, sortable: true },
  { key: 'averagePower', label: 'Avg Power', icon: Zap, sortable: true },
  { key: 'totalKills', label: 'Total Kills', icon: Sword, sortable: true },
  { key: 'killDeathRatio', label: 'K/D Ratio', icon: Target, sortable: true },
  { key: 'totalMerits', label: 'Total Merits', icon: Trophy, sortable: true },
  { key: 'winRate', label: 'Win Rate', icon: Trophy, sortable: true },
];

export function AllianceLeaderboard({ data, loading, onSort, onAllianceClick }: AllianceLeaderboardProps) {
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
    return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
  };

  const getMemberCountColor = (count: number) => {
    if (count >= 100) return 'text-green-400';
    if (count >= 50) return 'text-yellow-400';
    if (count >= 25) return 'text-orange-400';
    return 'text-red-400';
  };

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

  if (!data || data.alliances.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center text-gray-400">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No alliance data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>Alliance Rankings</span>
          <span className="text-sm text-gray-400 font-normal">
            {data.totalAlliances} alliances
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                {columns.map(column => {
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Top Player
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {data.alliances.map(alliance => (
                <tr
                  key={alliance.tag}
                  onClick={() => onAllianceClick(alliance)}
                  className={`cursor-pointer transition-colors hover:bg-gray-700 ${
                    isManagedAlliance(alliance.tag) 
                      ? 'ring-1 ring-yellow-400/30 bg-gray-800/50' 
                      : ''
                  }`}
                >
                  <td className="px-4 py-3 text-sm">
                    <Badge className={getRankBadgeColor(alliance.rank)}>
                      #{alliance.rank}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Shield className={`w-4 h-4 ${isManagedAlliance(alliance.tag) ? 'text-yellow-400' : 'text-blue-400'}`} />
                      <span className="text-white font-medium">{alliance.tag}</span>
                      {isManagedAlliance(alliance.tag) && (
                        <span className="text-yellow-400 text-sm">★</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={getMemberCountColor(alliance.memberCount)}>
                      {alliance.memberCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {formatNumber(alliance.totalPower)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {formatNumber(alliance.averagePower)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {formatNumber(alliance.totalKills)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={
                      typeof alliance.killDeathRatio === 'number' && alliance.killDeathRatio > 1 ? 'text-green-400' :
                      typeof alliance.killDeathRatio === 'number' && alliance.killDeathRatio < 1 ? 'text-red-400' : 'text-gray-300'
                    }>
                      {alliance.killDeathRatio}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {formatNumber(alliance.totalMerits)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={
                      typeof alliance.winRate === 'number' && alliance.winRate > 50 ? 'text-green-400' :
                      typeof alliance.winRate === 'number' && alliance.winRate < 50 ? 'text-red-400' : 'text-gray-300'
                    }>
                      {alliance.winRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div>
                      <p className="text-white font-medium">{alliance.topPlayer.name}</p>
                      <p className="text-xs text-gray-400">
                        {formatNumber(alliance.topPlayer.power)} power
                      </p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}