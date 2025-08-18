'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Users, 
  Plus,
  Edit2,
  Trash2,
  UserPlus,
  Crown,
  Swords,
  AlertCircle,
  X,
  UserMinus,
  Search,
  CheckSquare,
  Square
} from 'lucide-react';

interface Player {
  lordId: string;
  currentName: string;
  allianceTag?: string;
  cityLevel: number;
  currentPower: number;
  hasLeftRealm: boolean;
}

interface Team {
  id: string;
  name: string;
  color?: string;
  description?: string;
  participations?: Array<{
    id: string;
    player: {
      lordId: string;
      currentName: string;
    };
    joinedAt: string;
  }>;
  createdAt: string;
}

interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
}

interface TeamManagementProps {
  eventId?: string;
}

export function TeamManagement({ eventId }: TeamManagementProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(eventId || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [showPlayerManagement, setShowPlayerManagement] = useState<string | null>(null); // teamId
  
  // Form state
  const [teamName, setTeamName] = useState('');
  const [teamColor, setTeamColor] = useState('#8B5CF6');
  const [teamDescription, setTeamDescription] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  
  // Player selection state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [playerLoading, setPlayerLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchPlayers();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchTeams();
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
        
        // Auto-select first active event if no eventId provided
        if (!selectedEventId && data.events?.length > 0) {
          const activeEvent = data.events.find((e: Event) => e.isActive) || data.events[0];
          setSelectedEventId(activeEvent.id);
        }
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  const fetchTeams = async () => {
    if (!selectedEventId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/events/${selectedEventId}/teams`);
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      } else {
        setError('Failed to fetch teams');
      }
    } catch (err) {
      setError('Error loading teams');
      console.error('Error fetching teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayers = async () => {
    try {
      setPlayerLoading(true);
      const response = await fetch('/api/players');
      if (response.ok) {
        const data = await response.json();
        setPlayers(data.players || []);
      } else {
        console.error('Failed to fetch players');
      }
    } catch (err) {
      console.error('Error fetching players:', err);
    } finally {
      setPlayerLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!selectedEventId || !teamName.trim()) return;

    try {
      setFormLoading(true);
      const response = await fetch(`/api/events/${selectedEventId}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: teamName.trim(),
          color: teamColor,
          description: teamDescription.trim() || undefined,
        }),
      });

      if (response.ok) {
        await fetchTeams();
        resetForm();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create team');
      }
    } catch (err) {
      setError('Error creating team');
      console.error('Error creating team:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateTeam = async () => {
    if (!selectedEventId || !editingTeam || !teamName.trim()) return;

    try {
      setFormLoading(true);
      const response = await fetch(`/api/events/${selectedEventId}/teams/${editingTeam.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: teamName.trim(),
          color: teamColor,
          description: teamDescription.trim() || undefined,
        }),
      });

      if (response.ok) {
        await fetchTeams();
        resetForm();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update team');
      }
    } catch (err) {
      setError('Error updating team');
      console.error('Error updating team:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team? This will remove all team assignments.')) {
      return;
    }

    try {
      const response = await fetch(`/api/events/${selectedEventId}/teams/${teamId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTeams();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete team');
      }
    } catch (err) {
      setError('Error deleting team');
      console.error('Error deleting team:', err);
    }
  };

  const resetForm = () => {
    setTeamName('');
    setTeamColor('#8B5CF6');
    setTeamDescription('');
    setShowCreateForm(false);
    setEditingTeam(null);
    setError(null);
  };

  const startEditing = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamColor(team.color || '#8B5CF6');
    setTeamDescription(team.description || '');
    setShowCreateForm(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleAddPlayersToTeam = async (teamId: string) => {
    if (selectedPlayers.size === 0) return;

    try {
      setPlayerLoading(true);
      const response = await fetch(`/api/events/${selectedEventId}/teams/${teamId}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerIds: Array.from(selectedPlayers)
        }),
      });

      if (response.ok) {
        setSelectedPlayers(new Set());
        setShowPlayerManagement(null);
        await fetchTeams(); // Refresh teams to show updated member counts
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add players to team');
      }
    } catch (err) {
      setError('Error adding players to team');
      console.error('Error adding players to team:', err);
    } finally {
      setPlayerLoading(false);
    }
  };

  const handleRemovePlayerFromTeam = async (teamId: string, playerId: string) => {
    try {
      const response = await fetch(`/api/events/${selectedEventId}/teams/${teamId}/players/${playerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTeams(); // Refresh teams to show updated member counts
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to remove player from team');
      }
    } catch (err) {
      setError('Error removing player from team');
      console.error('Error removing player from team:', err);
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      newSelected.add(playerId);
    }
    setSelectedPlayers(newSelected);
  };

  const filteredPlayers = players.filter(player => 
    !player.hasLeftRealm && (
      player.currentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.allianceTag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.lordId.includes(searchTerm)
    )
  );

  const colorOptions = [
    { value: '#8B5CF6', name: 'Purple' },
    { value: '#EF4444', name: 'Red' },
    { value: '#10B981', name: 'Green' },
    { value: '#3B82F6', name: 'Blue' },
    { value: '#F59E0B', name: 'Orange' },
    { value: '#EC4899', name: 'Pink' },
    { value: '#6366F1', name: 'Indigo' },
    { value: '#14B8A6', name: 'Teal' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-red-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Team Management</h2>
            <p className="text-sm text-gray-400">Create and manage teams for Roots of War events</p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Team
        </Button>
      </div>

      {/* Event Selection */}
      {events.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Select RoW Event</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">Select an event...</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.name} - {formatDate(event.startDate)} {event.isActive && '(Active)'}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              {editingTeam ? 'Edit Team' : 'Create New Team'}
              <Button
                variant="ghost"
                size="sm"
                onClick={resetForm}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Team Name *
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Team Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setTeamColor(color.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      teamColor === color.value 
                        ? 'border-white scale-110' 
                        : 'border-gray-600 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description (optional)
              </label>
              <textarea
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                placeholder="Team strategy, role, or notes..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                maxLength={200}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={editingTeam ? handleUpdateTeam : handleCreateTeam}
                disabled={formLoading || !teamName.trim() || !selectedEventId}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {formLoading ? 'Saving...' : editingTeam ? 'Update Team' : 'Create Team'}
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

      {/* Teams List */}
      {selectedEventId && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Swords className="w-5 h-5" />
              Teams ({teams.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
              </div>
            ) : teams.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No teams created yet</p>
                <p className="text-sm mt-2">Create your first team to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map(team => (
                  <div
                    key={team.id}
                    className="p-4 bg-gray-700 rounded-lg border border-gray-600"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: team.color || '#8B5CF6' }}
                        />
                        <h3 className="font-medium text-white">{team.name}</h3>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(team)}
                          className="text-gray-400 hover:text-white p-1 h-auto"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTeam(team.id)}
                          className="text-red-400 hover:text-red-300 p-1 h-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {team.description && (
                      <p className="text-sm text-gray-400 mb-3">{team.description}</p>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-gray-400">
                        <Users className="w-3 h-3" />
                        {team.participations?.length || 0} members
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(team.createdAt)}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <Button
                        onClick={() => setShowPlayerManagement(team.id)}
                        variant="outline"
                        size="sm"
                        className="w-full bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                      >
                        <UserPlus className="w-3 h-3 mr-2" />
                        Manage Players
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Player Management Modal */}
      {showPlayerManagement && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Manage Team Players
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowPlayerManagement(null);
                  setSelectedPlayers(new Set());
                  setSearchTerm('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Team Members */}
            {(() => {
              const currentTeam = teams.find(t => t.id === showPlayerManagement);
              return currentTeam?.participations && currentTeam.participations.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Current Team Members</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                    {currentTeam.participations.map((participation) => (
                      <div
                        key={participation.id}
                        className="flex items-center justify-between p-2 bg-gray-700 rounded border border-gray-600"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                            <span className="text-xs text-white font-medium">
                              {participation.player.currentName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm text-white">{participation.player.currentName}</p>
                            <p className="text-xs text-gray-400">ID: {participation.player.lordId}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemovePlayerFromTeam(showPlayerManagement, participation.player.lordId)}
                          className="text-red-400 hover:text-red-300 p-1 h-auto"
                        >
                          <UserMinus className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No players assigned to this team yet</p>
                </div>
              );
            })()}

            {/* Player Search and Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-300">Add Players</h4>
                {selectedPlayers.size > 0 && (
                  <Button
                    onClick={() => handleAddPlayersToTeam(showPlayerManagement)}
                    disabled={playerLoading}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {playerLoading ? 'Adding...' : `Add ${selectedPlayers.size} Selected`}
                  </Button>
                )}
              </div>

              {/* Search Input */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search players by name, alliance, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {/* Player List */}
              <div className="max-h-64 overflow-y-auto border border-gray-600 rounded-md">
                {playerLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500 mx-auto"></div>
                  </div>
                ) : filteredPlayers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No players found</p>
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {filteredPlayers.map((player) => {
                      const isSelected = selectedPlayers.has(player.lordId);
                      const isAlreadyInTeam = teams
                        .find(t => t.id === showPlayerManagement)
                        ?.participations?.some(p => p.player.lordId === player.lordId);
                      
                      return (
                        <div
                          key={player.lordId}
                          onClick={() => !isAlreadyInTeam && togglePlayerSelection(player.lordId)}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                            isAlreadyInTeam 
                              ? 'bg-gray-600 opacity-50 cursor-not-allowed'
                              : isSelected
                              ? 'bg-red-600/20 border border-red-500/30'
                              : 'bg-gray-700 hover:bg-gray-600'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center">
                              {isAlreadyInTeam ? (
                                <div className="w-4 h-4 bg-gray-500 rounded flex items-center justify-center">
                                  <span className="text-xs text-white">✓</span>
                                </div>
                              ) : isSelected ? (
                                <CheckSquare className="w-4 h-4 text-red-400" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                              <span className="text-xs text-white font-medium">
                                {player.currentName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm text-white">{player.currentName}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span>ID: {player.lordId}</span>
                                {player.allianceTag && (
                                  <>
                                    <span>•</span>
                                    <span>[{player.allianceTag}]</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400">
                            <span>Lvl {player.cityLevel}</span>
                            {isAlreadyInTeam && <span className="ml-2 text-green-400">(In Team)</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedEventId && events.length === 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-bold text-white mb-2">No Events Available</h3>
            <p className="text-gray-400 mb-6">
              You need to create a Roots of War event before you can manage teams.
            </p>
            <Button
              onClick={() => window.location.href = '/dashboard/events'}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Create Event First
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}