'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  Calendar,
  Zap,
  Sword,
  Trophy,
  Crown,
  Target,
  Shield
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
  loading: boolean;
}

const metricIcons: { [key: string]: any } = {
  currentPower: Zap,
  merits: Trophy,
  unitsKilled: Sword,
  unitsDead: Shield,
  victories: Crown,
  defeats: Shield,
  cityLevel: Users,
  killDeathRatio: Target,
  winRate: Trophy
};

const metricLabels: { [key: string]: string } = {
  currentPower: 'Power',
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

export function ChangesSummary({ summary, loading }: ChangesSummaryProps) {
  const formatNumber = (num: number) => {
    if (Math.abs(num) >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    }
    if (Math.abs(num) >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (Math.abs(num) >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const formatChange = (change: number) => {
    const formatted = formatNumber(Math.abs(change));
    return change >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getPercentage = (value: number, total: number) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : '0';
  };

  const Icon = metricIcons[summary.metric] || BarChart3;

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Information */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            Comparison Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm">From</p>
              <p className="text-white font-medium">{formatDate(summary.fromSnapshot.timestamp)}</p>
              <p className="text-gray-500 text-xs">{summary.fromSnapshot.filename}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Comparison Type</p>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                {compareTypeLabels[summary.compareType] || summary.compareType}
              </Badge>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">To</p>
              <p className="text-white font-medium">{formatDate(summary.toSnapshot.timestamp)}</p>
              <p className="text-gray-500 text-xs">{summary.toSnapshot.filename}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Players Analyzed */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Players Analyzed</p>
                <p className="text-2xl font-bold text-white">{summary.totalPlayers.toLocaleString()}</p>
                <p className="text-xs text-gray-500">With changes in {metricLabels[summary.metric]}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        {/* Players with Gains */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Gainers</p>
                <p className="text-2xl font-bold text-green-400">{summary.playersGained.toLocaleString()}</p>
                <p className="text-xs text-gray-500">
                  {getPercentage(summary.playersGained, summary.totalPlayers)}% of players
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* Players with Losses */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Losers</p>
                <p className="text-2xl font-bold text-red-400">{summary.playersLost.toLocaleString()}</p>
                <p className="text-xs text-gray-500">
                  {getPercentage(summary.playersLost, summary.totalPlayers)}% of players
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        {/* Average Change */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Average Change</p>
                <p className={`text-2xl font-bold ${getChangeColor(summary.avgChange)}`}>
                  {formatChange(summary.avgChange)}
                </p>
                <p className="text-xs text-gray-500">Per player</p>
              </div>
              <Icon className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Insights */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Analysis Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                Growth Trend
              </h4>
              <p className="text-gray-400 text-sm">
                {summary.playersGained > summary.playersLost ? (
                  <>More players gained than lost {metricLabels[summary.metric]}. Positive kingdom trend.</>
                ) : summary.playersGained < summary.playersLost ? (
                  <>More players lost than gained {metricLabels[summary.metric]}. Declining trend.</>
                ) : (
                  <>Equal number of gainers and losers. Stable kingdom performance.</>
                )}
              </p>
            </div>
            
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                Activity Level
              </h4>
              <p className="text-gray-400 text-sm">
                {summary.totalPlayers > 0 ? (
                  <>
                    {((summary.playersGained + summary.playersLost) / summary.totalPlayers * 100).toFixed(1)}% 
                    of players showed significant changes in {metricLabels[summary.metric]}.
                  </>
                ) : (
                  'No significant activity detected in this period.'
                )}
              </p>
            </div>
            
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-yellow-400" />
                Performance
              </h4>
              <p className="text-gray-400 text-sm">
                {summary.avgChange > 0 ? (
                  <>Kingdom average shows positive growth. Players are generally improving.</>
                ) : summary.avgChange < 0 ? (
                  <>Kingdom average shows decline. Consider investigating causes.</>
                ) : (
                  <>Kingdom performance is stable with minimal average change.</>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}