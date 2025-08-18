'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  X,
  Trophy,
  Target,
  Swords,
  Shield,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Crown,
  Award
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface EventHistory {
  id: string;
  gameEvent: {
    id: string;
    name: string;
    eventDate: string;
    status: string;
    outcome?: string;
    eventType: string;
    teams: Array<{
      name: string;
      color?: string;
    }>;
  };
  role: {
    name: string;
    color?: string;
  };
  garrisonPoints: number;
  seedPoints: number;
  killPoints: number;
  totalPoints: number;
  performanceRating?: string;
  mvpVotes: number;
}

interface PlayerAnalytics {
  totalEvents: number;
  finalizedEvents: number;
  totalPoints: number;
  totalKillPoints: number;
  totalGarrisonPoints: number;
  totalSeedPoints: number;
  averagePoints: number;
  averageKillPoints: number;
  bestPerformance: number;
  bestKillPoints: number;
  mvpVotes: number;
  winRate: number;
}

interface RoleStats {
  [roleName: string]: {
    events: number;
    totalPoints: number;
    totalKillPoints: number;
    averagePoints: number;
    averageKillPoints: number;
  };
}

interface Player {
  lordId: string;
  currentName: string;
  hasLeftRealm: boolean;
  lastSeenAt?: string;
}

interface PlayerEventHistoryProps {
  playerId: string;
  onClose: () => void;
}

export function PlayerEventHistory({ playerId, onClose }: PlayerEventHistoryProps) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [eventHistory, setEventHistory] = useState<EventHistory[]>([]);
  const [analytics, setAnalytics] = useState<PlayerAnalytics | null>(null);
  const [roleStats, setRoleStats] = useState<RoleStats>({});
  const [recentForm, setRecentForm] = useState<any[]>([]);
  const [performanceTrend, setPerformanceTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayerHistory();
  }, [playerId]);

  const fetchPlayerHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/row/players/${playerId}/history`);
      if (response.ok) {
        const data = await response.json();
        setPlayer(data.player);
        setEventHistory(data.eventHistory);
        setAnalytics(data.analytics);
        setRoleStats(data.roleStats);
        setRecentForm(data.recentForm);
        setPerformanceTrend(data.performanceTrend);
      } else {
        setError('Failed to fetch player history');
      }
    } catch (err) {
      setError('Error loading player history');
      console.error('Error fetching player history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPerformanceRatingColor = (rating?: string) => {
    switch (rating) {
      case 'S': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'A': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'B': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'C': return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default: return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    }
  };

  const getTrendIcon = () => {
    if (recentForm.length < 2) return <Minus className="w-4 h-4" />;
    
    const recent = recentForm.slice(0, 3).reduce((sum, event) => sum + event.totalPoints, 0) / 3;
    const older = recentForm.slice(3, 6).reduce((sum, event) => sum + event.totalPoints, 0) / 3;
    
    if (recent > older * 1.1) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (recent < older * 0.9) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  // Chart data for performance trend
  const chartData = {
    labels: performanceTrend.map(event => formatDate(event.eventDate)),
    datasets: [
      {
        label: 'Total Points',
        data: performanceTrend.map(event => event.totalPoints),
        borderColor: '#DC2626',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        tension: 0.4
      },
      {
        label: 'Kill Points',
        data: performanceTrend.map(event => event.killPoints),
        borderColor: '#7C3AED',
        backgroundColor: 'rgba(124, 58, 237, 0.1)',
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#E5E7EB'
        }
      },
      title: {
        display: true,
        text: 'Performance Trend (Last 10 Events)',
        color: '#E5E7EB'
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#9CA3AF'
        },
        grid: {
          color: '#374151'
        }
      },
      y: {
        ticks: {
          color: '#9CA3AF'
        },
        grid: {
          color: '#374151'
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="bg-gray-800 border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="bg-gray-800 border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              Player Event History
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-red-300">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-gray-800 border-gray-700 w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {player?.currentName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold">{player?.currentName}</h2>
                <p className="text-sm text-gray-400">ROW Event History</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Analytics Overview */}
            {analytics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gray-700 border-gray-600">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400">Total Events</p>
                        <p className="text-xl font-bold text-white">{analytics.finalizedEvents}</p>
                      </div>
                      <Calendar className="w-5 h-5 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-700 border-gray-600">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400">Avg Points</p>
                        <p className="text-xl font-bold text-white">{Math.round(analytics.averagePoints)}</p>
                      </div>
                      <Target className="w-5 h-5 text-green-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-700 border-gray-600">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400">Best Score</p>
                        <p className="text-xl font-bold text-white">{analytics.bestPerformance}</p>
                      </div>
                      <Trophy className="w-5 h-5 text-yellow-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-700 border-gray-600">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400">Form</p>
                        <div className="flex items-center gap-1">
                          {getTrendIcon()}
                        </div>
                      </div>
                      {analytics.mvpVotes > 0 && (
                        <div className="flex items-center gap-1">
                          <Award className="w-4 h-4 text-yellow-400" />
                          <span className="text-xs text-yellow-400">{analytics.mvpVotes}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Performance Chart */}
            {performanceTrend.length > 0 && (
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Performance Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Role Performance */}
            {Object.keys(roleStats).length > 0 && (
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Role Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(roleStats).map(([roleName, stats]) => (
                      <div key={roleName} className="p-3 bg-gray-600 rounded-lg">
                        <h4 className="font-medium text-white mb-2">{roleName}</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Events:</span>
                            <span className="text-white">{stats.events}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Avg Points:</span>
                            <span className="text-white">{Math.round(stats.averagePoints)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Avg Kills:</span>
                            <span className="text-white">{Math.round(stats.averageKillPoints)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Event History */}
            <Card className="bg-gray-700 border-gray-600">
              <CardHeader>
                <CardTitle className="text-white text-lg">Event History</CardTitle>
              </CardHeader>
              <CardContent>
                {eventHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No ROW event history found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {eventHistory.map(event => (
                      <div key={event.id} className="p-4 bg-gray-600 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-white">{event.gameEvent.name}</h4>
                            <Badge variant="outline" className="text-xs" style={{ 
                              backgroundColor: event.role.color + '20', 
                              borderColor: event.role.color + '50',
                              color: event.role.color || '#fff'
                            }}>
                              {event.role.name}
                            </Badge>
                          </div>
                          <span className="text-sm text-gray-400">{formatDate(event.gameEvent.eventDate)}</span>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4 text-sm mb-2">
                          <div>
                            <span className="text-gray-400">Garrison:</span>
                            <span className="text-white ml-1">{event.garrisonPoints}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Seed:</span>
                            <span className="text-white ml-1">{event.seedPoints}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Kills:</span>
                            <span className="text-white ml-1">{event.killPoints}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Total:</span>
                            <span className="text-white font-medium ml-1">{event.totalPoints}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {event.performanceRating && (
                              <Badge className={getPerformanceRatingColor(event.performanceRating)}>
                                {event.performanceRating}
                              </Badge>
                            )}
                            {event.mvpVotes > 0 && (
                              <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                                <Award className="w-3 h-3 mr-1" />
                                {event.mvpVotes} MVP
                              </Badge>
                            )}
                          </div>
                          {event.gameEvent.outcome && (
                            <Badge variant="outline" className="text-xs">
                              {event.gameEvent.outcome}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}