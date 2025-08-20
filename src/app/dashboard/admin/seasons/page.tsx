'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  Plus,
  Edit3,
  Check,
  X,
  RefreshCw,
  Clock,
  Trophy,
  AlertTriangle
} from 'lucide-react';

interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  description: string | null;
  snapshotCount: number;
  createdAt: string;
}

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [newSeason, setNewSeason] = useState({
    name: '',
    startDate: '',
    endDate: '',
    description: ''
  });

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/admin/seasons');
      if (response.ok) {
        const data = await response.json();
        setSeasons(data.seasons);
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSeason)
      });

      if (response.ok) {
        setShowCreateForm(false);
        setNewSeason({ name: '', startDate: '', endDate: '', description: '' });
        fetchSeasons();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create season');
      }
    } catch (error) {
      console.error('Error creating season:', error);
    }
  };

  const setActiveSeason = async (seasonId: string) => {
    if (!confirm('Set this season as active? This will deactivate all other seasons.')) return;
    
    try {
      const response = await fetch(`/api/admin/seasons/${seasonId}/activate`, {
        method: 'PATCH'
      });

      if (response.ok) {
        fetchSeasons();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to activate season');
      }
    } catch (error) {
      console.error('Error activating season:', error);
    }
  };

  const endSeason = async (seasonId: string) => {
    if (!confirm('End this season? This will set the end date to now and deactivate it.')) return;
    
    try {
      const response = await fetch(`/api/admin/seasons/${seasonId}/end`, {
        method: 'PATCH'
      });

      if (response.ok) {
        fetchSeasons();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to end season');
      }
    } catch (error) {
      console.error('Error ending season:', error);
    }
  };

  const detectMeritReset = async () => {
    if (!confirm('Analyze recent uploads to detect potential merit resets? This will suggest creating a new season if merit resets are detected.')) return;
    
    try {
      const response = await fetch('/api/admin/seasons/detect-reset', {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.resetDetected) {
          const createNew = confirm(`Merit reset detected around ${new Date(data.resetDate).toLocaleDateString()}!\n\nSuggested new season: "${data.suggestedSeasonName}"\n\nCreate this season now?`);
          if (createNew) {
            setNewSeason({
              name: data.suggestedSeasonName,
              startDate: data.resetDate.split('T')[0],
              endDate: '',
              description: 'Auto-detected season based on merit reset analysis'
            });
            setShowCreateForm(true);
          }
        } else {
          alert('No merit reset detected in recent uploads.');
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to detect merit reset');
      }
    } catch (error) {
      console.error('Error detecting merit reset:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDuration = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return `${days} days`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-400" />
            Season Management
          </h1>
          <p className="text-gray-400">
            Manage game seasons and merit reset periods
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={detectMeritReset}
            className="flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            Detect Merit Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSeasons}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Season
          </Button>
        </div>
      </div>

      {/* Create Season Form */}
      {showCreateForm && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Create New Season</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createSeason} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Season Name
                </label>
                <input
                  type="text"
                  value={newSeason.name}
                  onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  placeholder="e.g., Season 3, Spring 2024"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newSeason.startDate}
                    onChange={(e) => setNewSeason({ ...newSeason, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={newSeason.endDate}
                    onChange={(e) => setNewSeason({ ...newSeason, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newSeason.description}
                  onChange={(e) => setNewSeason({ ...newSeason, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  rows={3}
                  placeholder="Season description or notes"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Create Season</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Seasons List */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Seasons ({seasons.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
            </div>
          ) : seasons.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No seasons created yet</p>
              <p className="text-sm">Create your first season to start tracking merit data</p>
            </div>
          ) : (
            <div className="space-y-3">
              {seasons.map(season => (
                <div 
                  key={season.id}
                  className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{season.name}</p>
                        {season.isActive && (
                          <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>Started: {formatDate(season.startDate)}</span>
                        {season.endDate && (
                          <span>Ended: {formatDate(season.endDate)}</span>
                        )}
                        <span>{getDuration(season.startDate, season.endDate)}</span>
                        <span>{season.snapshotCount} snapshots</span>
                      </div>
                      {season.description && (
                        <p className="text-gray-400 text-sm mt-1">{season.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!season.isActive && !season.endDate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveSeason(season.id)}
                        className="text-green-400 hover:text-green-300"
                      >
                        <Check className="w-4 h-4" />
                        Activate
                      </Button>
                    )}
                    {season.isActive && !season.endDate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => endSeason(season.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Clock className="w-4 h-4" />
                        End Season
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Season Info */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Season Management Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                Season Creation
              </h4>
              <p className="text-gray-400">
                Create seasons when merits reset. Use the &quot;Detect Merit Reset&quot; button to automatically identify when a new season should begin.
              </p>
            </div>
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                Active Seasons
              </h4>
              <p className="text-gray-400">
                Only one season can be active at a time. New uploads will be automatically assigned to the active season.
              </p>
            </div>
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                Merit Tracking
              </h4>
              <p className="text-gray-400">
                Merit analytics will only compare data within the same season, ensuring accurate comparisons despite resets.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}