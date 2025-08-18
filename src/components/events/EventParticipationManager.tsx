'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Calendar,
  MessageSquare,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface EventParticipation {
  id: string;
  joinedAt: string;
  leftAt?: string;
  notes?: string;
  team?: {
    id: string;
    name: string;
    color?: string;
  };
  player: {
    lordId: string;
    currentName: string;
  };
  addedBy: {
    id: string;
    username: string;
    name?: string;
  };
}

interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
}

interface Team {
  id: string;
  name: string;
  color?: string;
}

interface EventParticipationManagerProps {
  event: Event;
  selectedPlayers: Set<string>;
  selectedTeam?: Team | null;
  onPlayersAdded: () => void;
  onPlayersRemoved: () => void;
  canManageEvents: boolean;
  showActionButtons?: boolean;
  showParticipantsList?: boolean;
}

export function EventParticipationManager({
  event,
  selectedPlayers,
  selectedTeam,
  onPlayersAdded,
  onPlayersRemoved,
  canManageEvents,
  showActionButtons = true,
  showParticipantsList = true
}: EventParticipationManagerProps) {
  const [participations, setParticipations] = useState<EventParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedForRemoval, setSelectedForRemoval] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (event?.id) {
      fetchParticipations();
    }
  }, [event?.id]);

  const fetchParticipations = async () => {
    if (!event?.id) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/events/${event.id}/participants`);
      if (!response.ok) throw new Error('Failed to fetch participants');
      const data = await response.json();
      setParticipations(data.participations);
    } catch (err) {
      setError('Failed to load participants');
      console.error('Error fetching participants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayers = async () => {
    if (!event?.id || selectedPlayers.size === 0) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/events/${event.id}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerIds: Array.from(selectedPlayers),
          teamId: selectedTeam?.id || undefined,
          notes: notes.trim() || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add participants');
      }

      // Refresh participations list
      await fetchParticipations();
      
      // Clear notes and notify parent
      setNotes('');
      onPlayersAdded();
      
      // Show success message
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add participants');
      console.error('Error adding participants:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemovePlayers = async () => {
    if (!event?.id || selectedPlayers.size === 0) return;

    if (!confirm(`Are you sure you want to remove ${selectedPlayers.size} player(s) from this event?`)) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/events/${event.id}/participants`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerIds: Array.from(selectedPlayers)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove participants');
      }

      // Refresh participations list
      await fetchParticipations();
      
      // Notify parent
      onPlayersRemoved();
      
      // Show success message
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove participants');
      console.error('Error removing participants:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveSelected = async () => {
    if (!event?.id || selectedForRemoval.size === 0) return;

    if (!confirm(`Are you sure you want to remove ${selectedForRemoval.size} participant(s) from this event?`)) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/events/${event.id}/participants`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerIds: Array.from(selectedForRemoval)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove participants');
      }

      // Refresh participations list and clear selection
      await fetchParticipations();
      setSelectedForRemoval(new Set());
      
      // Show success message
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove participants');
      console.error('Error removing participants:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleParticipantForRemoval = (playerId: string) => {
    const newSelection = new Set(selectedForRemoval);
    if (newSelection.has(playerId)) {
      newSelection.delete(playerId);
    } else {
      newSelection.add(playerId);
    }
    setSelectedForRemoval(newSelection);
  };

  const selectAllParticipants = () => {
    const allPlayerIds = participations.map(p => p.player.lordId);
    setSelectedForRemoval(new Set(allPlayerIds));
  };

  const clearSelection = () => {
    setSelectedForRemoval(new Set());
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

  const currentParticipantIds = new Set(participations.map(p => p.player.lordId));
  const selectedCurrentParticipants = Array.from(selectedPlayers).filter(id => 
    currentParticipantIds.has(id)
  );
  const selectedNonParticipants = Array.from(selectedPlayers).filter(id => 
    !currentParticipantIds.has(id)
  );

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      {showActionButtons && canManageEvents && selectedPlayers.size > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Manage Participants
              <Badge className="bg-purple-600/30 text-purple-200 border-purple-500/50">
                {selectedPlayers.size} selected
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Players Section */}
            {selectedNonParticipants.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-green-400" />
                  <span className="text-white font-medium">
                    Add {selectedNonParticipants.length} player(s) to event
                    {selectedTeam && (
                      <span className="text-gray-400">
                        {' '}to team{' '}
                        <span className="inline-flex items-center gap-1">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: selectedTeam.color || '#8B5CF6' }}
                          />
                          {selectedTeam.name}
                        </span>
                      </span>
                    )}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about these participants..."
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>

                <Button
                  onClick={handleAddPlayers}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {actionLoading ? 'Adding...' : `Add ${selectedNonParticipants.length} Player(s)`}
                </Button>
              </div>
            )}

            {/* Remove Players Section */}
            {selectedCurrentParticipants.length > 0 && (
              <div className="space-y-3">
                {selectedNonParticipants.length > 0 && (
                  <div className="border-t border-gray-600 pt-3" />
                )}
                
                <div className="flex items-center gap-2">
                  <UserMinus className="w-4 h-4 text-red-400" />
                  <span className="text-white font-medium">
                    Remove {selectedCurrentParticipants.length} participant(s) from event
                  </span>
                </div>

                <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-300">
                    This will mark the selected players as having left the event. This action cannot be easily undone.
                  </div>
                </div>

                <Button
                  onClick={handleRemovePlayers}
                  disabled={actionLoading}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  {actionLoading ? 'Removing...' : `Remove ${selectedCurrentParticipants.length} Player(s)`}
                </Button>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Current Participants */}
      {showParticipantsList && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Current Participants
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  {participations.length} total
                </Badge>
                {selectedForRemoval.size > 0 && (
                  <Badge className="bg-red-600/30 text-red-200 border-red-500/50">
                    {selectedForRemoval.size} selected
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : participations.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No participants yet</p>
                {canManageEvents && (
                  <p className="text-sm mt-2">Select players above to add them to this event</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Bulk Actions */}
                {canManageEvents && (
                  <div className="flex items-center gap-2 p-3 bg-gray-900 rounded-lg border border-gray-600">
                    <div className="flex-1">
                      <p className="text-sm text-gray-300">Bulk Actions:</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllParticipants}
                        disabled={participations.length === 0}
                        className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearSelection}
                        disabled={selectedForRemoval.size === 0}
                        className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                      >
                        Clear
                      </Button>
                      {selectedForRemoval.size > 0 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleRemoveSelected}
                          disabled={actionLoading}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove ({selectedForRemoval.size})
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}

                {/* Participants List */}
                <div className="space-y-3">
                  {participations.map(participation => {
                    const isSelectedFromGrid = selectedPlayers.has(participation.player.lordId);
                    const isSelectedForRemoval = selectedForRemoval.has(participation.player.lordId);
                    
                    return (
                      <div
                        key={participation.id}
                        className={`
                          p-3 rounded-lg border transition-all duration-200
                          ${isSelectedForRemoval 
                            ? 'bg-red-600/20 border-red-500' 
                            : isSelectedFromGrid
                            ? 'bg-purple-600/20 border-purple-500' 
                            : 'bg-gray-700 border-gray-600'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            {/* Checkbox for removal selection */}
                            {canManageEvents && (
                              <input
                                type="checkbox"
                                checked={isSelectedForRemoval}
                                onChange={() => toggleParticipantForRemoval(participation.player.lordId)}
                                className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                              />
                            )}
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-white font-medium">
                                  {participation.player.currentName}
                                </h4>
                                {isSelectedFromGrid && (
                                  <Badge className="bg-purple-600/40 text-purple-200 text-xs">
                                    From Grid
                                  </Badge>
                                )}
                                {isSelectedForRemoval && (
                                  <Badge className="bg-red-600/40 text-red-200 text-xs">
                                    Selected for Removal
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                ID: {participation.player.lordId}
                              </p>
                              
                              <div className="mt-2 space-y-1 text-xs text-gray-400">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3 h-3" />
                                  Joined: {formatDate(participation.joinedAt)}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Users className="w-3 h-3" />
                                  Added by: {participation.addedBy.name || participation.addedBy.username}
                                </div>
                                
                                {participation.team && (
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: participation.team.color || '#8B5CF6' }}
                                    />
                                    Team: {participation.team.name}
                                  </div>
                                )}
                                
                                {participation.notes && (
                                  <div className="flex items-start gap-2 mt-2">
                                    <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                    <span className="text-gray-300 text-xs">
                                      {participation.notes}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}