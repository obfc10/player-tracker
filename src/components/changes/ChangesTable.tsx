'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp,
  TrendingDown,
  Users,
  Shield,
  Zap,
  Sword,
  Trophy,
  Crown,
  Target
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
  type: 'gainers' | 'losers' | 'smallestIncreases';
  metric: string;
  loading: boolean;
  onPlayerClick: (change: Change) => void;
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

export function ChangesTable({ changes, title, type, metric, loading, onPlayerClick }: ChangesTableProps) {
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

  const formatPercent = (percent: number) => {
    if (Math.abs(percent) >= 1000) {
      return `${percent > 0 ? '+' : ''}${Math.round(percent)}%`;
    }
    return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;
  };

  const getChangeColor = (change: number, isGainer: boolean) => {
    if (isGainer) {
      return change > 0 ? 'text-green-400' : 'text-red-400';
    } else {
      return change < 0 ? 'text-red-400' : 'text-green-400';
    }
  };

  const getPercentColor = (percent: number) => {
    if (Math.abs(percent) >= 100) return 'text-yellow-400';
    if (Math.abs(percent) >= 50) return 'text-orange-400';
    if (Math.abs(percent) >= 25) return 'text-blue-400';
    return 'text-gray-300';
  };

  const Icon = metricIcons[metric] || Zap;
  const isGainer = type === 'gainers';
  const isSmallestIncrease = type === 'smallestIncreases';

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            {isGainer ? (
              <TrendingUp className="w-5 h-5 text-green-400" />
            ) : isSmallestIncrease ? (
              <Target className="w-5 h-5 text-yellow-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
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
            {isGainer ? (
              <TrendingUp className="w-5 h-5 text-green-400" />
            ) : isSmallestIncrease ? (
              <Target className="w-5 h-5 text-yellow-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center text-gray-400">
          <Icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No {type} found for {metricLabels[metric] || metric}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isGainer ? (
              <TrendingUp className="w-5 h-5 text-green-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
            {title}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Icon className="w-4 h-4" />
            {metricLabels[metric] || metric}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-2 p-4">
          {changes.map((change, index) => (
            <div
              key={change.playerId}
              onClick={() => onPlayerClick(change)}
              className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-gray-600 rounded-full text-sm font-bold text-white">
                  {(index + 1).toString()}
                </div>
                <div>
                  <p className="text-white font-medium">{change.name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {change.allianceTag && (
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                        {change.allianceTag}
                      </Badge>
                    )}
                    <span>Level {change.cityLevel}</span>
                    <span>•</span>
                    <span>ID: {change.playerId}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-400">
                    <div>{formatNumber(change.fromValue)}</div>
                    <div className="text-xs">→</div>
                    <div>{formatNumber(change.toValue)}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${getChangeColor(change.change, isGainer)}`}>
                      {formatChange(change.change)}
                    </div>
                    <div className={`text-sm ${getPercentColor(change.percentChange)}`}>
                      {formatPercent(change.percentChange)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {changes.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            <Icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No significant changes found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}