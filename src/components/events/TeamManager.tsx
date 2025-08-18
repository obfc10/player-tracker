'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  AlertTriangle,
  Palette
} from 'lucide-react';

interface Team {
  id: string;
  name: string;
  color?: string;
  description?: string;
  _count: {
    participations: number;
  };
}

interface TeamManagerProps {
  eventId: string;
  canManageEvents: boolean;
  onTeamSelect?: (team: Team | null) => void;
  selectedTeamId?: string;
}

export function TeamManager({ 
  eventId, 
  canManageEvents, 
  onTeamSelect,
  selectedTeamId 
}: TeamManagerProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    color: '#8B5CF6',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchTeams();
    }
  }, [eventId]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/events/${eventId}/teams`);
      if (!response.ok) throw new Error('Failed to fetch teams');
      const data = await response.json();
      setTeams(data.teams);
    } catch (err) {
      setError('Failed to load teams');
      console.error('Error fetching teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/events/${eventId}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          color: formData.color,
          description: formData.description.trim() || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create team');
      }

      // Reset form and refresh teams
      setFormData({ name: '', color: '#8B5CF6', description: '' });
      setShowCreateForm(false);
      await fetchTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTeamClick = (team: Team) => {
    if (onTeamSelect) {
      onTeamSelect(selectedTeamId === team.id ? null : team);
    }
  };

  const predefinedColors = [
    '#8B5CF6', '#EF4444', '#10B981', '#F59E0B', 
    '#3B82F6', '#EC4899', '#6366F1', '#84CC16'
  ];

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
          <p className="text-gray-400 mt-2">Loading teams...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6 text-center text-red-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchTeams}
            className="mt-2 bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Teams ({teams.length})
          </div>
          {canManageEvents && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-purple-600 border-purple-500 text-white hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Team
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create Team Form */}
        {showCreateForm && canManageEvents && (
          <form onSubmit={handleCreateTeam} className="p-4 bg-gray-900 rounded-lg border border-gray-600 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Team Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter team name..."
                disabled={submitting}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                maxLength={50}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Team Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  disabled={submitting}
                  className="w-8 h-8 rounded border border-gray-600 bg-gray-700 disabled:opacity-50"
                />
                <div className="flex gap-1">
                  {predefinedColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      disabled={submitting}
                      className="w-6 h-6 rounded border border-gray-600 hover:scale-110 transition-transform disabled:opacity-50"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description (optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Team description..."
                rows={2}
                disabled={submitting}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none disabled:opacity-50"
                maxLength={200}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                disabled={submitting || !formData.name.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Team'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                disabled={submitting}
                className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Teams List */}
        {teams.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No teams created yet</p>
            {canManageEvents && !showCreateForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateForm(true)}
                className="mt-2 bg-purple-600 border-purple-500 text-white hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Create First Team
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {teams.map(team => (
              <div 
                key={team.id}
                onClick={() => handleTeamClick(team)}
                className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                  selectedTeamId === team.id 
                    ? 'bg-purple-900/30 border-purple-500/50' 
                    : 'bg-gray-900 border-gray-600 hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-600"
                      style={{ backgroundColor: team.color || '#8B5CF6' }}
                    />
                    <div>
                      <h4 className="text-white font-medium">{team.name}</h4>
                      {team.description && (
                        <p className="text-sm text-gray-400">{team.description}</p>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-gray-700 text-gray-300 border-gray-600">
                    {team._count.participations} members
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}