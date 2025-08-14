'use client';

import { Card, CardContent } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  BarChart3,
  Calendar,
  Target
} from 'lucide-react';

interface Summary {
  totalPlayers: number;
  playersGained: number;
  playersLost: number;
  avgChange: number;
  metric: string;
  compareType: string;
  fromSnapshot: {
    id: string;
    timestamp: string;
    kingdom: string;
    filename: string;
  };
  toSnapshot: {
    id: string;
    timestamp: string;
    kingdom: string;
    filename: string;
  };
}

interface ChangesSummaryProps {
  summary: Summary;
  loading?: boolean;
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
  winRate: 'Win Rate'
};

const compareTypeLabels: { [key: string]: string } = {
  previous: 'Previous Snapshot',
  week: 'Past Week',
  custom: 'Custom Period'
};

export function ChangesSummary({ summary, loading = false }: ChangesSummaryProps) {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAvgChange = (change: number, metric: string) => {
    switch (metric) {
      case 'killDeathRatio':
        return change.toFixed(3);
      case 'winRate':
        return `${change.toFixed(1)}%`;
      default:
        return formatNumber(Math.abs(change));
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-700 rounded mb-2"></div>
                <div className="h-8 bg-gray-700 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const gainersPercentage = summary.totalPlayers > 0 ? 
    ((summary.playersGained / summary.totalPlayers) * 100).toFixed(1) : '0';
  
  const losersPercentage = summary.totalPlayers > 0 ? 
    ((summary.playersLost / summary.totalPlayers) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Period Information */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-purple-400" />
              <div>
                <h3 className="text-white font-medium">
                  Comparing {compareTypeLabels[summary.compareType] || summary.compareType}
                </h3>
                <p className="text-gray-400 text-sm">
                  {metricLabels[summary.metric] || summary.metric} changes analysis
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">
                From: {formatDate(summary.fromSnapshot.timestamp)}
              </div>
              <div className="text-sm text-gray-400">
                To: {formatDate(summary.toSnapshot.timestamp)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Players</p>
                <p className="text-2xl font-bold text-white">
                  {summary.totalPlayers.toLocaleString()}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Gainers</p>
                <p className="text-2xl font-bold text-green-400">
                  {summary.playersGained.toLocaleString()}
                </p>
                <p className="text-xs text-green-300">
                  {gainersPercentage}% of players
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Losers</p>
                <p className="text-2xl font-bold text-red-400">
                  {summary.playersLost.toLocaleString()}
                </p>
                <p className="text-xs text-red-300">
                  {losersPercentage}% of players
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Avg Change</p>
                <p className={`text-2xl font-bold ${
                  summary.avgChange > 0 ? 'text-green-400' : 
                  summary.avgChange < 0 ? 'text-red-400' : 'text-gray-300'
                }`}>
                  {summary.avgChange > 0 ? '+' : ''}{formatAvgChange(summary.avgChange, summary.metric)}
                </p>
              </div>
              <BarChart3 className={`w-8 h-8 ${
                summary.avgChange > 0 ? 'text-green-500' : 
                summary.avgChange < 0 ? 'text-red-500' : 'text-gray-500'
              }`} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}