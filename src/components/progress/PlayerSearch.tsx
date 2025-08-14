'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Plus, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Player {
  lordId: string;
  currentName: string;
  currentPower: number;
  allianceTag: string | null;
  lastSeen: string | null;
}

interface PlayerSearchProps {
  selectedPlayers: Player[];
  onPlayerAdd: (player: Player) => void;
  onPlayerRemove: (lordId: string) => void;
  maxPlayers?: number;
}

export function PlayerSearch({ 
  selectedPlayers, 
  onPlayerAdd, 
  onPlayerRemove, 
  maxPlayers = 5 
}: PlayerSearchProps) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchPlayers(query);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const searchPlayers = async (searchQuery: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/search/players?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Error searching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerSelect = (player: Player) => {
    onPlayerAdd(player);
    setQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  const isPlayerSelected = (lordId: string) => {
    return selectedPlayers.some(p => p.lordId === lordId);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search players by name or Lord ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={selectedPlayers.length >= maxPlayers}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
            </div>
          )}
        </div>

        {/* Search Results */}
        {showResults && searchResults.length > 0 && (
          <Card className="absolute top-full left-0 right-0 z-10 mt-1 bg-gray-800 border-gray-600 max-h-64 overflow-y-auto">
            <CardContent className="p-2">
              {searchResults.map((player) => (
                <div
                  key={player.lordId}
                  onClick={() => !isPlayerSelected(player.lordId) && handlePlayerSelect(player)}
                  className={`
                    flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors
                    ${isPlayerSelected(player.lordId) 
                      ? 'bg-gray-700 opacity-50 cursor-not-allowed' 
                      : 'hover:bg-gray-700'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-white font-medium">{player.currentName}</p>
                      <div className="flex items-center space-x-2 text-xs text-gray-400">
                        <span>ID: {player.lordId}</span>
                        <span>•</span>
                        <span>{formatNumber(player.currentPower)} power</span>
                        {player.allianceTag && (
                          <>
                            <span>•</span>
                            <span>{player.allianceTag}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {isPlayerSelected(player.lordId) ? (
                    <span className="text-gray-500 text-sm">Selected</span>
                  ) : (
                    <Plus className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {showResults && searchResults.length === 0 && query.length >= 2 && !loading && (
          <Card className="absolute top-full left-0 right-0 z-10 mt-1 bg-gray-800 border-gray-600">
            <CardContent className="p-4 text-center text-gray-400">
              No players found matching "{query}"
            </CardContent>
          </Card>
        )}
      </div>

      {/* Selected Players */}
      {selectedPlayers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-300">
              Selected Players ({selectedPlayers.length}/{maxPlayers})
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => selectedPlayers.forEach(p => onPlayerRemove(p.lordId))}
              className="text-gray-400 hover:text-white text-xs"
            >
              Clear All
            </Button>
          </div>
          
          <div className="space-y-2">
            {selectedPlayers.map((player) => (
              <div
                key={player.lordId}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <User className="w-4 h-4 text-purple-400" />
                  <div>
                    <p className="text-white font-medium">{player.currentName}</p>
                    <div className="flex items-center space-x-2 text-xs text-gray-400">
                      <span>ID: {player.lordId}</span>
                      <span>•</span>
                      <span>{formatNumber(player.currentPower)} power</span>
                      {player.allianceTag && (
                        <>
                          <span>•</span>
                          <span>{player.allianceTag}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>Last seen: {formatDate(player.lastSeen)}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPlayerRemove(player.lordId)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedPlayers.length >= maxPlayers && (
        <p className="text-sm text-yellow-400">
          Maximum of {maxPlayers} players can be compared at once.
        </p>
      )}
    </div>
  );
}