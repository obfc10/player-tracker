'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EventScoringInterface } from './EventScoringInterface';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Users,
  Trophy,
  Clock,
  CheckCircle,
  XCircle,
  Settings,
  Swords,
  Calculator
} from 'lucide-react';

interface PersistentTeam {
  id: string;
  name: string;
  color?: string;
}

interface GameEvent {
  id: string;
  name: string;
  description?: string;
  eventDate: string;
  status: 'DRAFT' | 'ACTIVE' | 'SCORING' | 'FINALIZED';
  eventType: string;
  maxTeams: number;
  outcome?: string;
  teams: PersistentTeam[];
  playerRoles: any[];
  createdBy: {
    username: string;
    name?: string;
  };
  _count: {
    playerRoles: number;
  };
}

export function GameEventManager() {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [teams, setTeams] = useState<PersistentTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoringEventId, setScoringEventId] = useState<string | null>(null);

  // Form states
  const [eventName, setEventName] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [maxTeams, setMaxTeams] = useState(3);

  useEffect(() => {
    fetchEvents();
    fetchTeams();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/row/game-events?limit=20');
      if (response.ok) {
        const data = await response.json();
        setEvents(data.gameEvents || []);
      } else {
        setError('Failed to fetch events');
      }
    } catch (err) {
      setError('Error loading events');
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/row/teams');
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  };

  const createEvent = async () => {
    if (!eventName.trim() || !eventDate) return;

    try {
      setFormLoading(true);
      const response = await fetch('/api/row/game-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: eventName.trim(),
          description: eventDescription.trim() || undefined,
          eventDate,
          maxTeams,
          teamIds: selectedTeamIds
        })
      });

      if (response.ok) {
        await fetchEvents();
        resetForm();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create event');
      }
    } catch (err) {
      setError('Error creating event');
      console.error('Error creating event:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const updateEventStatus = async (eventId: string, status: string) => {
    try {
      const response = await fetch(`/api/row/game-events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        await fetchEvents();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update event status');
      }
    } catch (err) {
      setError('Error updating event status');
      console.error('Error updating event:', err);
    }
  };

  const resetForm = () => {
    setEventName('');
    setEventDescription('');
    setEventDate('');
    setSelectedTeamIds([]);
    setMaxTeams(3);
    setShowCreateForm(false);
    setError(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'ACTIVE': return <Swords className="w-4 h-4 text-blue-400" />;
      case 'SCORING': return <Settings className="w-4 h-4 text-purple-400" />;
      case 'FINALIZED': return <CheckCircle className="w-4 h-4 text-green-400" />;
      default: return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'ACTIVE': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'SCORING': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'FINALIZED': return 'bg-green-500/20 text-green-300 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-red-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Game Events</h2>
            <p className="text-sm text-gray-400">Create and manage ROW events</p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Create New ROW Event</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Event Name *
              </label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="ROW Championship..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Event Date & Time *
              </label>
              <input
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description (optional)
              </label>
              <textarea
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="Event details, rules, or notes..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Participating Teams (optional)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {teams.map(team => (
                  <label key={team.id} className="flex items-center gap-2 p-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600">
                    <input
                      type="checkbox"
                      checked={selectedTeamIds.includes(team.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTeamIds([...selectedTeamIds, team.id]);
                        } else {
                          setSelectedTeamIds(selectedTeamIds.filter(id => id !== team.id));
                        }
                      }}
                      className="text-red-500"
                    />
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: team.color || '#DC2626' }}
                      />
                      <span className="text-sm text-white">{team.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={createEvent}
                disabled={formLoading || !eventName.trim() || !eventDate}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {formLoading ? 'Creating...' : 'Create Event'}
              </Button>
              <Button
                variant="outline"
                onClick={resetForm}
                className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events List */}
      {loading ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
          </CardContent>
        </Card>
      ) : events.length === 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-50" />
            <h3 className="text-xl font-bold text-white mb-2">No Events Created</h3>
            <p className="text-gray-400 mb-6">Create your first ROW event to get started.</p>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {events.map(event => (
            <Card key={event.id} className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-white">{event.name}</span>
                  <Badge className={getStatusColor(event.status)}>
                    {getStatusIcon(event.status)}
                    <span className="ml-1">{event.status}</span>
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Date:</span>
                    <span className="text-white">{formatDate(event.eventDate)}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Teams:</span>
                    <div className="flex items-center gap-1">
                      {event.teams.slice(0, 3).map(team => (
                        <div
                          key={team.id}
                          className="w-4 h-4 rounded-full border border-gray-600"
                          style={{ backgroundColor: team.color || '#DC2626' }}
                          title={team.name}
                        />
                      ))}
                      {event.teams.length > 3 && (
                        <span className="text-xs text-gray-400 ml-1">+{event.teams.length - 3}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Participants:</span>
                    <span className="text-white">{event._count.playerRoles}</span>
                  </div>

                  {event.outcome && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Outcome:</span>
                      <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                        <Trophy className="w-3 h-3 mr-1" />
                        {event.outcome}
                      </Badge>
                    </div>
                  )}

                  {event.description && (
                    <p className="text-sm text-gray-400 italic">{event.description}</p>
                  )}

                  {/* Status Actions */}
                  {event.status === 'DRAFT' && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => updateEventStatus(event.id, 'ACTIVE')}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Start Event
                      </Button>
                    </div>
                  )}

                  {event.status === 'ACTIVE' && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => updateEventStatus(event.id, 'SCORING')}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        Begin Scoring
                      </Button>
                    </div>
                  )}

                  {event.status === 'SCORING' && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => setScoringEventId(event.id)}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Calculator className="w-4 h-4 mr-1" />
                        Score Event
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateEventStatus(event.id, 'FINALIZED')}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Finalize Event
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Event Scoring Interface Modal */}
      {scoringEventId && (
        <EventScoringInterface
          eventId={scoringEventId}
          onClose={() => setScoringEventId(null)}
          onEventUpdate={fetchEvents}
        />
      )}
    </div>
  );
}