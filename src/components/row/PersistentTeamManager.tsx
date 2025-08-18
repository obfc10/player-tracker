'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  UserPlus,
  UserMinus,
  Search,
  CheckSquare,
  Square,
  Crown,
  Shield,
  Settings,
  X,
  AlertCircle
} from 'lucide-react';

interface Player {
  lordId: string;
  currentName: string;
  hasLeftRealm: boolean;
}

interface RosterEntry {
  id: string;
  player: Player;
  position: 'STARTER' | 'SUBSTITUTE';
  dateJoined: string;
  notes?: string;
}

interface PersistentTeam {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
  starters: RosterEntry[];
  substitutes: RosterEntry[];
  totalPlayers: number;
  totalEvents: number;
}

export function PersistentTeamManager() {
  const [teams, setTeams] = useState<PersistentTeam[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<PersistentTeam | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamColor, setTeamColor] = useState('#DC2626');
  const [formLoading, setFormLoading] = useState(false);
  
  // Player management states
  const [managingTeam, setManagingTeam] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [selectedPosition, setSelectedPosition] = useState<'STARTER' | 'SUBSTITUTE'>('STARTER');

  useEffect(() => {
    fetchTeams();
    fetchPlayers();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/row/teams');
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
      }
    } catch (err) {
      console.error('Error fetching players:', err);
    } finally {
      setPlayerLoading(false);
    }
  };

  const createTeam = async () => {
    if (!teamName.trim()) return;

    try {
      setFormLoading(true);
      const response = await fetch('/api/row/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamName.trim(),
          description: teamDescription.trim() || undefined,
          color: teamColor
        })
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

  const updateTeam = async () => {
    if (!teamName.trim() || !editingTeam) return;

    try {
      setFormLoading(true);
      const response = await fetch(`/api/row/teams/${editingTeam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamName.trim(),
          description: teamDescription.trim() || undefined,
          color: teamColor
        })
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

  const deleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/row/teams/${teamId}`, {
        method: 'DELETE'
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

  const addPlayersToTeam = async (teamId: string) => {
    if (selectedPlayers.size === 0) return;

    try {
      setPlayerLoading(true);
      const response = await fetch(`/api/row/teams/${teamId}/roster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerIds: Array.from(selectedPlayers),
          position: selectedPosition
        })
      });

      if (response.ok) {
        setSelectedPlayers(new Set());
        await fetchTeams();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add players to team');
      }
    } catch (err) {
      setError('Error adding players to team');
      console.error('Error adding players:', err);
    } finally {
      setPlayerLoading(false);
    }
  };

  const removePlayerFromTeam = async (teamId: string, playerId: string) => {
    try {
      const response = await fetch(`/api/row/teams/${teamId}/roster/${playerId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchTeams();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to remove player from team');
      }
    } catch (err) {
      setError('Error removing player from team');
      console.error('Error removing player:', err);
    }
  };

  const resetForm = () => {
    setTeamName('');
    setTeamDescription('');
    setTeamColor('#DC2626');
    setShowCreateForm(false);
    setEditingTeam(null);
    setError(null);
  };

  const startEditing = (team: PersistentTeam) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamDescription(team.description || '');
    setTeamColor(team.color || '#DC2626');
    setShowCreateForm(true);
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
      player.lordId.includes(searchTerm)
    )
  );

  const colorOptions = [
    { value: '#DC2626', name: 'Red' },
    { value: '#2563EB', name: 'Blue' },
    { value: '#16A34A', name: 'Green' },
    { value: '#CA8A04', name: 'Yellow' },
    { value: '#7C3AED', name: 'Purple' },
    { value: '#DB2777', name: 'Pink' },
    { value: '#059669', name: 'Teal' },
    { value: '#DC2626', name: 'Orange' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-red-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Persistent Teams</h2>
            <p className="text-sm text-gray-400">Manage permanent team rosters for ROW events</p>
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
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
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
                placeholder="Team strategy, focus, or notes..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
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
                onClick={editingTeam ? updateTeam : createTeam}
                disabled={formLoading || !teamName.trim()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {formLoading ? (editingTeam ? 'Updating...' : 'Creating...') : editingTeam ? 'Update Team' : 'Create Team'}
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
      {loading ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
          </CardContent>
        </Card>
      ) : teams.length === 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-50" />
            <h3 className="text-xl font-bold text-white mb-2">No Teams Created</h3>
            <p className="text-gray-400 mb-6">Create your first persistent team to get started with ROW management.</p>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {teams.map(team => (
            <Card key={team.id} className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: team.color || '#DC2626' }}
                    />
                    <span className="text-white">{team.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditing(team)}
                      className="text-gray-400 hover:text-white p-1 h-auto"
                      title="Edit team"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setManagingTeam(team.id)}
                      className="text-blue-400 hover:text-blue-300 p-1 h-auto"
                      title="Manage roster"
                    >
                      <UserPlus className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTeam(team.id)}
                      className="text-red-400 hover:text-red-300 p-1 h-auto"
                      title="Delete team"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {team.description && (
                  <p className="text-sm text-gray-400 mb-4">{team.description}</p>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Starters</span>
                    <Badge variant="outline" className="bg-green-600/20 text-green-300 border-green-500/30">
                      <Crown className="w-3 h-3 mr-1" />
                      {team.starters.length}/30
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Substitutes</span>
                    <Badge variant="outline" className="bg-blue-600/20 text-blue-300 border-blue-500/30">
                      <Users className="w-3 h-3 mr-1" />
                      {team.substitutes.length}/15
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Total Events</span>
                    <span className="text-white">{team.totalEvents}</span>
                  </div>
                </div>

                {managingTeam === team.id && (
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <h4 className="text-sm font-medium text-white mb-3">Manage Roster</h4>
                    
                    {/* Position selector */}
                    <div className="flex gap-2 mb-3">
                      <Button
                        variant={selectedPosition === 'STARTER' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedPosition('STARTER')}
                        className={selectedPosition === 'STARTER' ? 'bg-green-600' : ''}
                      >
                        <Crown className="w-3 h-3 mr-1" />
                        Starter
                      </Button>
                      <Button
                        variant={selectedPosition === 'SUBSTITUTE' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedPosition('SUBSTITUTE')}
                        className={selectedPosition === 'SUBSTITUTE' ? 'bg-blue-600' : ''}
                      >
                        <Users className="w-3 h-3 mr-1" />
                        Sub
                      </Button>
                    </div>

                    {/* Player search */}
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search players..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                      />
                    </div>

                    {/* Player selection */}
                    <div className="max-h-40 overflow-y-auto border border-gray-600 rounded-md mb-3">
                      {playerLoading ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500 mx-auto"></div>
                        </div>
                      ) : filteredPlayers.length === 0 ? (
                        <div className="text-center py-4 text-gray-400 text-sm">
                          No players found
                        </div>
                      ) : (
                        <div className="space-y-1 p-2">
                          {filteredPlayers.slice(0, 10).map(player => {
                            const isSelected = selectedPlayers.has(player.lordId);
                            const isInTeam = team.starters.some(s => s.player.lordId === player.lordId) ||
                                           team.substitutes.some(s => s.player.lordId === player.lordId);
                            
                            return (
                              <div
                                key={player.lordId}
                                onClick={() => !isInTeam && togglePlayerSelection(player.lordId)}
                                className={`flex items-center justify-between p-2 rounded cursor-pointer text-sm transition-colors ${
                                  isInTeam 
                                    ? 'bg-gray-600 opacity-50 cursor-not-allowed'
                                    : isSelected
                                    ? 'bg-red-600/20 border border-red-500/30'
                                    : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {isInTeam ? (
                                    <div className="w-3 h-3 bg-gray-500 rounded flex items-center justify-center">
                                      <span className="text-xs text-white">✓</span>
                                    </div>
                                  ) : isSelected ? (
                                    <CheckSquare className="w-3 h-3 text-red-400" />
                                  ) : (
                                    <Square className="w-3 h-3 text-gray-400" />
                                  )}
                                  <span className="text-white">{player.currentName}</span>
                                </div>
                                {isInTeam && <span className="text-xs text-green-400">In Team</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {selectedPlayers.size > 0 && (
                        <Button
                          onClick={() => addPlayersToTeam(team.id)}
                          disabled={playerLoading}
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {playerLoading ? 'Adding...' : `Add ${selectedPlayers.size}`}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setManagingTeam(null)}
                        className="bg-gray-700 border-gray-600 text-gray-300"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}