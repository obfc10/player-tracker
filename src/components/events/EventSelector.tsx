'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Plus } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  description?: string;
  isActive: boolean;
  createdBy: {
    id: string;
    username: string;
    name?: string;
  };
  _count: {
    participations: number;
    teams: number;
  };
}

interface EventSelectorProps {
  onEventSelect: (event: Event | null) => void;
  canManageEvents: boolean;
  onCreateEvent: () => void;
}

export function EventSelector({ 
  onEventSelect, 
  canManageEvents, 
  onCreateEvent
}: EventSelectorProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      const event = events.find(e => e.id === selectedEvent);
      onEventSelect(event || null);
    } else {
      onEventSelect(null);
    }
  }, [selectedEvent, events]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/events?includeInactive=false');
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data.events);
    } catch (err) {
      setError('Failed to load events');
      console.error('Error fetching events:', err);
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

  const formatDateRange = (startDate: string, endDate?: string) => {
    const start = formatDate(startDate);
    if (!endDate) return `${start} - Ongoing`;
    return `${start} - ${formatDate(endDate)}`;
  };

  if (error) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6 text-center text-red-400">
          <p>{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
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
            <CalendarDays className="w-5 h-5" />
            Event Selection
          </div>
          {canManageEvents && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCreateEvent}
              className="bg-purple-600 border-purple-500 text-white hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Event
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Event Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Event
          </label>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-4 text-gray-400">
              <p>No events found</p>
              {canManageEvents && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCreateEvent}
                  className="mt-2 bg-purple-600 border-purple-500 text-white hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Create First Event
                </Button>
              )}
            </div>
          ) : (
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select an event...</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.name} ({event._count.participations} participants, {event._count.teams} teams)
                </option>
              ))}
            </select>
          )}

        </div>

        {/* Selected Event Details */}
        {selectedEvent && (
          <div className="mt-4 p-4 bg-gray-900 rounded-lg border border-gray-600">
            {(() => {
              const event = events.find(e => e.id === selectedEvent);
              if (!event) return null;
              
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-medium">{event.name}</h4>
                  </div>
                  <p className="text-sm text-gray-400">
                    {formatDateRange(event.startDate, event.endDate)}
                  </p>
                  {event.description && (
                    <p className="text-sm text-gray-300">{event.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Created by {event.createdBy.name || event.createdBy.username}</span>
                    <div className="flex items-center gap-2">
                      <span>{event._count.participations} participants</span>
                      <span>{event._count.teams} teams</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}