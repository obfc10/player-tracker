'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  User,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface Change {
  playerId: string;
  name: string;
  currentName: string;
  allianceTag: string | null;
  division: number;
  cityLevel: number;
  fromValue: number;
  toValue: number;
  change: number;
  percentChange: number;
}

interface ChangesTableProps {
  changes: Change[];
  title: string;
  type: 'gainers' | 'losers';
  metric: string;
  loading?: boolean;
  onPlayerClick?: (change: Change) => void;
}

const metricLabels: { [key: string]: string } = {
  currentPower: 'Power',
  power: 'Total Power',
  merits: 'Merits',
  unitsKilled: 'Units Killed',
  unitsDead: 'Units Lost',
  victories: 'Victories',
  defeats: 'Defeats',
  cityLevel: 'City Level',
  killDeathRatio: 'K/D Ratio',
  winRate: 'Win Rate %'
};

export function ChangesTable({ 
  changes, 
  title, 
  type, 
  metric, 
  loading = false,
  onPlayerClick 
}: ChangesTableProps) {
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

  const formatValue = (value: number, metric: string) => {
    switch (metric) {
      case 'killDeathRatio':
        return value === 999 ? '∞' : value.toFixed(2);
      case 'winRate':
        return `${value.toFixed(1)}%`;
      default:
        return formatNumber(value);
    }
  };

  const formatChange = (change: number, percentChange: number, metric: string) => {
    const prefix = change > 0 ? '+' : '';
    const formattedChange = formatValue(Math.abs(change), metric);
    const formattedPercent = Math.abs(percentChange).toFixed(1);
    
    return {
      value: `${prefix}${formattedChange}`,
      percent: `${prefix}${formattedPercent}%`
    };
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (changes.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            {type === 'gainers' ? 
              <TrendingUp className="w-5 h-5 text-green-400" /> : 
              <TrendingDown className="w-5 h-5 text-red-400" />
            }
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-gray-400 p-8">
          <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No {type} found for {metricLabels[metric] || metric}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          {type === 'gainers' ? 
            <TrendingUp className="w-5 h-5 text-green-400" /> : 
            <TrendingDown className="w-5 h-5 text-red-400" />
          }
          {title}
          <span className="text-sm text-gray-400 font-normal">
            ({changes.length} players)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider min-w-48">
                  Player
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Previous
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Current
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Change
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {changes.map((change, index) => {
                const formatted = formatChange(change.change, change.percentChange, metric);
                
                return (
                  <tr
                    key={change.playerId}
                    onClick={() => onPlayerClick?.(change)}
                    className="hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">#{index + 1}</span>
                        {type === 'gainers' ? 
                          <ArrowUp className="w-4 h-4 text-green-400" /> :
                          <ArrowDown className="w-4 h-4 text-red-400" />
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-48">
                      <div>
                        <p className="text-white font-medium truncate">{change.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {change.allianceTag && (
                            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                              {change.allianceTag}
                            </Badge>
                          )}
                          <span className="text-gray-400 text-xs">
                            ID: {change.playerId}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {formatValue(change.fromValue, metric)}
                    </td>
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      {formatValue(change.toValue, metric)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className={`text-sm font-bold ${
                          change.change > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatted.value}
                        </span>
                        <span className={`text-xs ${
                          change.change > 0 ? 'text-green-300' : 'text-red-300'
                        }`}>
                          {formatted.percent}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}