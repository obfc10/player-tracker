'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Search, X, Users } from 'lucide-react';

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
  maxPlayers: number;
}

export function PlayerSearch({ selectedPlayers, onPlayerAdd, onPlayerRemove, maxPlayers }: PlayerSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm.length >= 2) {
        searchPlayers();
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const searchPlayers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/search/players?q=${encodeURIComponent(searchTerm)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
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
    setSearchTerm('');
    setShowResults(false);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    }
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
            placeholder="Search by player name or Lord ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
            disabled={selectedPlayers.length >= maxPlayers}
          />
        </div>

        {/* Search Results Dropdown */}
        {showResults && (
          <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto"></div>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((player) => {
                const isSelected = selectedPlayers.some(p => p.lordId === player.lordId);
                const isDisabled = selectedPlayers.length >= maxPlayers && !isSelected;
                
                return (
                  <div
                    key={player.lordId}
                    onClick={() => !isSelected && !isDisabled && handlePlayerSelect(player)}
                    className={`p-3 border-b border-gray-600 last:border-b-0 cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-gray-600 opacity-50 cursor-not-allowed' 
                        : isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{player.currentName}</p>
                        <p className="text-gray-400 text-sm">
                          {player.allianceTag || 'No Alliance'} • ID: {player.lordId}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm">{formatNumber(player.currentPower)}</p>
                        <p className="text-gray-400 text-xs">Power</p>
                      </div>
                    </div>
                    {isSelected && (
                      <p className="text-purple-400 text-xs mt-1">Already selected</p>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-gray-400">
                No players found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Players */}
      {selectedPlayers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Selected Players ({selectedPlayers.length}/{maxPlayers})
            </h4>
          </div>
          
          <div className="space-y-2">
            {selectedPlayers.map((player) => (
              <div
                key={player.lordId}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
              >
                <div>
                  <p className="text-white font-medium">{player.currentName}</p>
                  <p className="text-gray-400 text-sm">
                    {player.allianceTag || 'No Alliance'} • {formatNumber(player.currentPower)} Power
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPlayerRemove(player.lordId)}
                  className="text-gray-400 hover:text-red-400 hover:bg-red-900/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-sm text-gray-400">
        {selectedPlayers.length === 0 ? (
          <p>Search and select up to {maxPlayers} players to compare their progress over time.</p>
        ) : selectedPlayers.length >= maxPlayers ? (
          <p>Maximum {maxPlayers} players selected. Remove a player to add another.</p>
        ) : (
          <p>You can select {maxPlayers - selectedPlayers.length} more player{maxPlayers - selectedPlayers.length !== 1 ? 's' : ''}.</p>
        )}
      </div>
    </div>
  );
}