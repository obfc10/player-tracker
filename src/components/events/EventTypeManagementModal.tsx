'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Settings, Plus, AlertTriangle, Trash2 } from 'lucide-react';

interface EventType {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  _count: {
    events: number;
  };
}

interface EventTypeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventTypesChanged: () => void;
}

export function EventTypeManagementModal({
  isOpen,
  onClose,
  onEventTypesChanged
}: EventTypeManagementModalProps) {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEventType, setNewEventType] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchEventTypes();
    }
  }, [isOpen]);

  const fetchEventTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/events/event-types');
      if (!response.ok) throw new Error('Failed to fetch event types');
      const data = await response.json();
      setEventTypes(data.eventTypes);
    } catch (err) {
      setError('Failed to load event types');
      console.error('Error fetching event types:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEventType = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEventType.name.trim()) {
      setError('Event type name is required');
      return;
    }

    try {
      setActionLoading('create');
      setError(null);
      
      const response = await fetch('/api/events/event-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newEventType.name.trim(),
          description: newEventType.description.trim() || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create event type');
      }

      // Reset form and refresh list
      setNewEventType({ name: '', description: '' });
      setShowCreateForm(false);
      await fetchEventTypes();
      onEventTypesChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event type');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (eventTypeId: string, currentStatus: boolean) => {
    try {
      setActionLoading(eventTypeId);
      setError(null);
      
      // Note: This would require implementing a PATCH endpoint for event types
      // For now, we'll just show the functionality
      console.log(`Toggle active status for ${eventTypeId} from ${currentStatus} to ${!currentStatus}`);
      
      // Refresh the list after a successful toggle
      await fetchEventTypes();
      onEventTypesChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event type');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = () => {
    if (!actionLoading) {
      onClose();
      setError(null);
      setShowCreateForm(false);
      setNewEventType({ name: '', description: '' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-gray-800 border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Manage Event Types
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={!!actionLoading}
              className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Create New Event Type */}
          <div className="border-b border-gray-600 pb-4">
            {!showCreateForm ? (
              <Button
                onClick={() => setShowCreateForm(true)}
                disabled={!!actionLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Event Type
              </Button>
            ) : (
              <form onSubmit={handleCreateEventType} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Event Type Name *
                  </label>
                  <input
                    type="text"
                    value={newEventType.name}
                    onChange={(e) => setNewEventType({ ...newEventType, name: e.target.value })}
                    placeholder="e.g., Kingdom vs Kingdom (KvK)"
                    disabled={!!actionLoading}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                    maxLength={50}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newEventType.description}
                    onChange={(e) => setNewEventType({ ...newEventType, description: e.target.value })}
                    placeholder="Describe what this event type is for..."
                    rows={2}
                    disabled={!!actionLoading}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none disabled:opacity-50"
                    maxLength={200}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={actionLoading === 'create'}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {actionLoading === 'create' ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewEventType({ name: '', description: '' });
                    }}
                    disabled={!!actionLoading}
                    className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Existing Event Types */}
          <div>
            <h3 className="text-white font-medium mb-3">Existing Event Types</h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : eventTypes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No event types found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {eventTypes.map(eventType => (
                  <div
                    key={eventType.id}
                    className="p-4 bg-gray-700 rounded-lg border border-gray-600"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-white font-medium truncate">
                            {eventType.name}
                          </h4>
                          <Badge 
                            className={eventType.isActive 
                              ? "bg-green-500/20 text-green-300 border-green-500/30" 
                              : "bg-gray-500/20 text-gray-300 border-gray-500/30"
                            }
                          >
                            {eventType.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                            {eventType._count.events} events
                          </Badge>
                        </div>
                        
                        {eventType.description && (
                          <p className="text-sm text-gray-300 mb-2">
                            {eventType.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {/* Note: Toggle functionality would need backend implementation */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(eventType.id, eventType.isActive)}
                          disabled={actionLoading === eventType.id}
                          className="bg-gray-600 border-gray-500 text-gray-300 hover:bg-gray-500 text-xs"
                        >
                          {actionLoading === eventType.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          ) : eventType.isActive ? (
                            'Deactivate'
                          ) : (
                            'Activate'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}