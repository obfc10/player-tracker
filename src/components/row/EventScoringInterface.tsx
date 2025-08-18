'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Save,
  Users,
  Trophy,
  Target,
  Shield,
  Crown,
  Edit3,
  CheckCircle,
  AlertCircle,
  Calculator
} from 'lucide-react';

interface EventRole {
  id: string;
  name: string;
  color?: string;
}

interface Player {
  lordId: string;
  currentName: string;
}

interface PlayerScore {
  id: string;
  playerId: string;
  roleId: string;
  garrisonPoints: number;
  seedPoints: number;
  killPoints: number;
  totalPoints: number;
  performanceRating?: string;
  mvpVotes: number;
  notes?: string;
  player: Player;
  role: EventRole;
}

interface GameEvent {
  id: string;
  name: string;
  eventDate: string;
  status: string;
  eventType: string;
  outcome?: string;
  teams: Array<{
    id: string;
    name: string;
    color?: string;
  }>;
}

interface EventScoringInterfaceProps {
  eventId: string;
  onClose: () => void;
  onEventUpdate?: () => void;
}

export function EventScoringInterface({ eventId, onClose, onEventUpdate }: EventScoringInterfaceProps) {
  const [event, setEvent] = useState<GameEvent | null>(null);
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);
  const [availableRoles, setAvailableRoles] = useState<EventRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingScore, setEditingScore] = useState<string | null>(null);
  const [outcomeInput, setOutcomeInput] = useState('');

  useEffect(() => {
    fetchEventData();
    fetchAvailableRoles();
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/row/game-events/${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setEvent(data.gameEvent);
        setPlayerScores(data.gameEvent.playerRoles || []);
        setOutcomeInput(data.gameEvent.outcome || '');
      } else {
        setError('Failed to fetch event data');
      }
    } catch (err) {
      setError('Error loading event data');
      console.error('Error fetching event:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableRoles = async () => {
    try {
      const response = await fetch('/api/row/roles');
      if (response.ok) {
        const data = await response.json();
        setAvailableRoles(data.roles || []);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const updatePlayerScore = async (scoreId: string, updates: Partial<PlayerScore>) => {
    try {
      const response = await fetch(`/api/row/game-events/${eventId}/scores/${scoreId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        await fetchEventData(); // Refresh data
        setEditingScore(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update score');
      }
    } catch (err) {
      setError('Error updating score');
      console.error('Error updating score:', err);
    }
  };

  const finalizeEvent = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/row/game-events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'FINALIZED',
          outcome: outcomeInput.trim() || undefined
        })
      });

      if (response.ok) {
        onEventUpdate?.();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to finalize event');
      }
    } catch (err) {
      setError('Error finalizing event');
      console.error('Error finalizing event:', err);
    } finally {
      setSaving(false);
    }
  };

  const calculateTotalPoints = (garrison: number, seed: number, kill: number) => {
    return garrison + seed + kill;
  };

  const getPerformanceRating = (totalPoints: number) => {
    if (totalPoints >= 100) return 'S';
    if (totalPoints >= 75) return 'A';
    if (totalPoints >= 50) return 'B';
    return 'C';
  };

  const getPerformanceColor = (rating?: string) => {
    switch (rating) {
      case 'S': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'A': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'B': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'C': return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default: return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    }
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
              Event Scoring
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
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
              <Calculator className="w-6 h-6 text-red-400" />
              <div>
                <h2 className="text-xl font-bold">{event?.name}</h2>
                <p className="text-sm text-gray-400">{formatDate(event?.eventDate || '')}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Event Info */}
            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center gap-4">
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                  {event?.status}
                </Badge>
                <div className="text-sm text-gray-400">
                  <span className="text-white font-medium">{playerScores.length}</span> participants
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={outcomeInput}
                  onChange={(e) => setOutcomeInput(e.target.value)}
                  placeholder="Event outcome (winner, draw, etc.)"
                  className="px-3 py-1 bg-gray-600 border border-gray-500 text-white rounded text-sm"
                />
                <Button
                  onClick={finalizeEvent}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {saving ? 'Finalizing...' : 'Finalize Event'}
                </Button>
              </div>
            </div>

            {/* Player Scores Table */}
            <Card className="bg-gray-700 border-gray-600">
              <CardHeader>
                <CardTitle className="text-white text-lg">Player Scores</CardTitle>
              </CardHeader>
              <CardContent>
                {playerScores.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No participants found for this event</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {playerScores.map(score => (
                      <ScoreRow
                        key={score.id}
                        score={score}
                        isEditing={editingScore === score.id}
                        onEdit={() => setEditingScore(score.id)}
                        onSave={(updates) => updatePlayerScore(score.id, updates)}
                        onCancel={() => setEditingScore(null)}
                        calculateTotalPoints={calculateTotalPoints}
                        getPerformanceRating={getPerformanceRating}
                        getPerformanceColor={getPerformanceColor}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scoring Guidelines */}
            <Card className="bg-gray-700 border-gray-600">
              <CardHeader>
                <CardTitle className="text-white text-lg">Scoring Guidelines</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <h4 className="text-white font-medium mb-2">Garrison Points</h4>
                    <p className="text-gray-400">Points for defending garrison attacks and objectives.</p>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-2">Seed Points</h4>
                    <p className="text-gray-400">Points for capturing seeds and strategic objectives.</p>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-2">Kill Points</h4>
                    <p className="text-gray-400">Points for eliminating enemy players and units.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Individual score row component
interface ScoreRowProps {
  score: PlayerScore;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updates: Partial<PlayerScore>) => void;
  onCancel: () => void;
  calculateTotalPoints: (garrison: number, seed: number, kill: number) => number;
  getPerformanceRating: (total: number) => string;
  getPerformanceColor: (rating?: string) => string;
}

function ScoreRow({ 
  score, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel,
  calculateTotalPoints,
  getPerformanceRating,
  getPerformanceColor
}: ScoreRowProps) {
  const [editData, setEditData] = useState({
    garrisonPoints: score.garrisonPoints,
    seedPoints: score.seedPoints,
    killPoints: score.killPoints,
    mvpVotes: score.mvpVotes,
    notes: score.notes || ''
  });

  const handleSave = () => {
    const totalPoints = calculateTotalPoints(editData.garrisonPoints, editData.seedPoints, editData.killPoints);
    const performanceRating = getPerformanceRating(totalPoints);
    
    onSave({
      ...editData,
      totalPoints,
      performanceRating
    });
  };

  if (isEditing) {
    return (
      <div className="p-4 bg-gray-600 rounded-lg border border-gray-500">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {score.player.currentName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium text-white">{score.player.currentName}</p>
              <Badge 
                variant="outline" 
                className="text-xs"
                style={{
                  backgroundColor: score.role.color + '20',
                  borderColor: score.role.color + '50',
                  color: score.role.color || '#fff'
                }}
              >
                {score.role.name}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Garrison</label>
            <input
              type="number"
              value={editData.garrisonPoints}
              onChange={(e) => setEditData({...editData, garrisonPoints: parseInt(e.target.value) || 0})}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 text-white rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Seed</label>
            <input
              type="number"
              value={editData.seedPoints}
              onChange={(e) => setEditData({...editData, seedPoints: parseInt(e.target.value) || 0})}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 text-white rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Kills</label>
            <input
              type="number"
              value={editData.killPoints}
              onChange={(e) => setEditData({...editData, killPoints: parseInt(e.target.value) || 0})}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 text-white rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">MVP Votes</label>
            <input
              type="number"
              value={editData.mvpVotes}
              onChange={(e) => setEditData({...editData, mvpVotes: parseInt(e.target.value) || 0})}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 text-white rounded text-sm"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-xs text-gray-400 mb-1">Notes</label>
          <input
            type="text"
            value={editData.notes}
            onChange={(e) => setEditData({...editData, notes: e.target.value})}
            placeholder="Performance notes..."
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 text-white rounded text-sm"
          />
        </div>
        
        <div className="mt-2 text-xs text-gray-400">
          Total: {calculateTotalPoints(editData.garrisonPoints, editData.seedPoints, editData.killPoints)} points
          (Rating: {getPerformanceRating(calculateTotalPoints(editData.garrisonPoints, editData.seedPoints, editData.killPoints))})
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-600 rounded-lg hover:bg-gray-550 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {score.player.currentName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-white">{score.player.currentName}</p>
            <Badge 
              variant="outline" 
              className="text-xs"
              style={{
                backgroundColor: score.role.color + '20',
                borderColor: score.role.color + '50',
                color: score.role.color || '#fff'
              }}
            >
              {score.role.name}
            </Badge>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Edit3 className="w-4 h-4 mr-1" />
          Edit
        </Button>
      </div>
      
      <div className="grid grid-cols-4 gap-4 text-sm mb-2">
        <div>
          <span className="text-gray-400">Garrison:</span>
          <span className="text-white ml-1 font-medium">{score.garrisonPoints}</span>
        </div>
        <div>
          <span className="text-gray-400">Seed:</span>
          <span className="text-white ml-1 font-medium">{score.seedPoints}</span>
        </div>
        <div>
          <span className="text-gray-400">Kills:</span>
          <span className="text-white ml-1 font-medium">{score.killPoints}</span>
        </div>
        <div>
          <span className="text-gray-400">Total:</span>
          <span className="text-white ml-1 font-bold">{score.totalPoints}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {score.performanceRating && (
            <Badge className={getPerformanceColor(score.performanceRating)}>
              {score.performanceRating}
            </Badge>
          )}
          {score.mvpVotes > 0 && (
            <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
              <Crown className="w-3 h-3 mr-1" />
              {score.mvpVotes} MVP
            </Badge>
          )}
        </div>
        {score.notes && (
          <p className="text-xs text-gray-400 italic">{score.notes}</p>
        )}
      </div>
    </div>
  );
}