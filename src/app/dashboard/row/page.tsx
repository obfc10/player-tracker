'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeamManagement } from '@/components/row/TeamManagement';
import { PersistentTeamManager } from '@/components/row/PersistentTeamManager';
import { PlayerEventHistory } from '@/components/row/PlayerEventHistory';
import { GameEventManager } from '@/components/row/GameEventManager';
import { 
  Sword, 
  Users, 
  Trophy,
  Calendar,
  Target,
  Shield,
  Settings
} from 'lucide-react';

interface OverviewStats {
  activeEvents: number;
  totalParticipants: number;
  wins: number;
  winRate: number;
}

interface CurrentEvent {
  id: string;
  name: string;
  eventDate: string;
  status: string;
  teams: Array<{ id: string; name: string; color?: string }>;
  _count: { playerRoles: number };
}

interface TopPerformer {
  id: string;
  totalPoints: number;
  player: { lordId: string; currentName: string };
  gameEvent: { name: string; eventDate: string };
  role: { name: string; color?: string };
}

export default function RowPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [currentEvents, setCurrentEvents] = useState<CurrentEvent[]>([]);
  const [eventHistory, setEventHistory] = useState<CurrentEvent[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // Fetch overview data when component mounts or tab changes to overview
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchOverviewData();
    }
  }, [activeTab]);

  const fetchOverviewData = async () => {
    try {
      setOverviewLoading(true);
      const response = await fetch('/api/row/overview');
      if (response.ok) {
        const data = await response.json();
        setOverviewStats(data.stats);
        setCurrentEvents(data.currentEvents || []);
        setEventHistory(data.eventHistory || []);
        setTopPerformers(data.topPerformers || []);
      }
    } catch (error) {
      console.error('Error fetching overview data:', error);
    } finally {
      setOverviewLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Roots of War Management</h1>
          <p className="text-gray-400">
            Manage Roots of War events, participation, and strategy coordination.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-800 w-full justify-start">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Sword className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="persistent-teams" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Persistent Teams
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Event Teams
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Events
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          {overviewLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-400">Active RoW Events</p>
                        <p className="text-2xl font-bold text-white">{overviewStats?.activeEvents || 0}</p>
                      </div>
                      <div className="p-3 bg-red-600/20 rounded-lg">
                        <Sword className="w-6 h-6 text-red-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-400">Participants</p>
                        <p className="text-2xl font-bold text-white">{overviewStats?.totalParticipants || 0}</p>
                      </div>
                      <div className="p-3 bg-blue-600/20 rounded-lg">
                        <Users className="w-6 h-6 text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-400">Wins</p>
                        <p className="text-2xl font-bold text-white">{overviewStats?.wins || 0}</p>
                      </div>
                      <div className="p-3 bg-green-600/20 rounded-lg">
                        <Trophy className="w-6 h-6 text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-400">Win Rate</p>
                        <p className="text-2xl font-bold text-white">{overviewStats?.winRate || 0}%</p>
                      </div>
                      <div className="p-3 bg-purple-600/20 rounded-lg">
                        <Target className="w-6 h-6 text-purple-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

              {/* Main Content */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Current Events */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Sword className="w-5 h-5" />
                      Current RoW Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentEvents.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <Sword className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No active Roots of War events</p>
                        <p className="text-sm mt-2">RoW events will appear here when created</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {currentEvents.map(event => (
                          <div key={event.id} className="p-3 bg-gray-700 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-white">{event.name}</h4>
                              <Badge className={
                                event.status === 'ACTIVE' 
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                  : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              }>
                                {event.status}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-400">{formatDate(event.eventDate)}</span>
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span className="text-white">{event._count.playerRoles}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Event History */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      RoW History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {eventHistory.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No Roots of War history</p>
                        <p className="text-sm mt-2">Past RoW events will be displayed here</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {eventHistory.map(event => (
                          <div key={event.id} className="p-3 bg-gray-700 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-white text-sm">{event.name}</h4>
                              <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                                COMPLETED
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-400">{formatDate(event.eventDate)}</span>
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-gray-400" />
                                <span className="text-white">{event._count.playerRoles}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Top Performers Section */}
              <Card className="bg-gray-800 border-gray-700 mt-6">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Top Performers (Last 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topPerformers.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No performance data available</p>
                      <p className="text-sm mt-2">Top performers will be shown here after events are completed</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topPerformers.slice(0, 5).map((performer, index) => (
                        <div key={performer.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer"
                             onClick={() => setSelectedPlayerId(performer.player.lordId)}>
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0 ? 'bg-yellow-500 text-black' :
                              index === 1 ? 'bg-gray-400 text-black' :
                              index === 2 ? 'bg-amber-600 text-white' :
                              'bg-gray-600 text-white'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-white">{performer.player.currentName}</p>
                              <p className="text-xs text-gray-400">{performer.gameEvent.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-white">{performer.totalPoints}</p>
                            <p className="text-xs text-gray-400">points</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

        </TabsContent>

        {/* Persistent Teams Tab */}
        <TabsContent value="persistent-teams">
          <PersistentTeamManager />
        </TabsContent>

        {/* Event Teams Tab */}
        <TabsContent value="teams">
          <TeamManagement />
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events">
          <GameEventManager />
        </TabsContent>
      </Tabs>

      {/* Player Event History Modal */}
      {selectedPlayerId && (
        <PlayerEventHistory
          playerId={selectedPlayerId}
          onClose={() => setSelectedPlayerId(null)}
        />
      )}
    </div>
  );
}