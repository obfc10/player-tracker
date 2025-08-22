'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Search, 
  CheckSquare, 
  Square, 
  Filter,
  SortAsc,
  SortDesc,
  Shield,
  Crown,
  X
} from 'lucide-react';

interface Player {
  lordId: string;
  currentName: string;
  allianceTag?: string;
  division: number;
  cityLevel: number;
  currentPower: number;
  hasLeftRealm: boolean;
}

interface PlayerSelectionGridProps {
  selectedPlayers: Set<string>;
  onSelectionChange: (playerIds: Set<string>) => void;
  disabled?: boolean;
  maxSelections?: number;
}

export function PlayerSelectionGrid({
  selectedPlayers,
  onSelectionChange,
  disabled = false,
  maxSelections
}: PlayerSelectionGridProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [allianceFilter, setAllianceFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof Player>('currentPower');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/players?includeLeftRealm=true');
      if (!response.ok) throw new Error('Failed to fetch players');
      const data = await response.json();
      setPlayers(data.data?.players || []);
    } catch (err) {
      setError('Failed to load players');
      console.error('Error fetching players:', err);
    } finally {
      setLoading(false);
    }
  };

  const alliances = useMemo(() => {
    const allianceSet = new Set<string>();
    players.forEach(player => {
      if (player.allianceTag) {
        allianceSet.add(player.allianceTag);
      }
    });
    return Array.from(allianceSet).sort();
  }, [players]);

  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = players;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(player =>
        player.currentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.lordId.includes(searchTerm)
      );
    }

    // Filter by alliance
    if (allianceFilter !== 'all') {
      if (allianceFilter === 'none') {
        filtered = filtered.filter(player => !player.allianceTag);
      } else {
        filtered = filtered.filter(player => player.allianceTag === allianceFilter);
      }
    }

    // Filter by active status
    if (showActiveOnly) {
      filtered = filtered.filter(player => !player.hasLeftRealm);
    }

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [players, searchTerm, allianceFilter, sortField, sortDirection, showActiveOnly]);

  const handlePlayerToggle = (playerId: string) => {
    if (disabled) return;

    const newSelection = new Set(selectedPlayers);
    
    if (newSelection.has(playerId)) {
      newSelection.delete(playerId);
    } else {
      if (maxSelections && newSelection.size >= maxSelections) {
        return; // Don't add if at max limit
      }
      newSelection.add(playerId);
    }
    
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (disabled) return;

    const visiblePlayerIds = filteredAndSortedPlayers.map(p => p.lordId);
    const allSelected = visiblePlayerIds.every(id => selectedPlayers.has(id));
    
    if (allSelected) {
      // Deselect all visible players
      const newSelection = new Set(selectedPlayers);
      visiblePlayerIds.forEach(id => newSelection.delete(id));
      onSelectionChange(newSelection);
    } else {
      // Select all visible players (up to max limit)
      const newSelection = new Set(selectedPlayers);
      let added = 0;
      
      for (const playerId of visiblePlayerIds) {
        if (!newSelection.has(playerId)) {
          if (maxSelections && newSelection.size >= maxSelections) break;
          newSelection.add(playerId);
          added++;
        }
      }
      
      onSelectionChange(newSelection);
    }
  };

  const handleClearSelection = () => {
    if (disabled) return;
    onSelectionChange(new Set());
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const handleSort = (field: keyof Player) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: keyof Player) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <SortAsc className="w-4 h-4" /> : 
      <SortDesc className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6 text-center text-red-400">
          <p>{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchPlayers}
            className="mt-2 bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const visiblePlayerIds = filteredAndSortedPlayers.map(p => p.lordId);
  const allVisibleSelected = visiblePlayerIds.length > 0 && visiblePlayerIds.every(id => selectedPlayers.has(id));
  const someVisibleSelected = visiblePlayerIds.some(id => selectedPlayers.has(id));

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Player Selection
            {selectedPlayers.size > 0 && (
              <Badge className="bg-purple-600/30 text-purple-200 border-purple-500/50">
                {selectedPlayers.size} selected
                {maxSelections && ` / ${maxSelections}`}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedPlayers.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
                disabled={disabled}
                className="bg-red-600/20 border-red-500/50 text-red-300 hover:bg-red-600/30"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={disabled || filteredAndSortedPlayers.length === 0}
              className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
            >
              {allVisibleSelected ? (
                <>
                  <Square className="w-4 h-4 mr-1" />
                  Deselect All
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4 mr-1" />
                  Select All
                </>
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sorting Controls */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-900 rounded-lg border border-gray-600">
          <span className="text-sm text-gray-300 mr-2">Sort by:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('currentPower')}
            className={`flex items-center gap-1 ${
              sortField === 'currentPower' 
                ? 'bg-purple-600/30 border-purple-500 text-purple-200' 
                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Shield className="w-3 h-3" />
            Power
            {getSortIcon('currentPower')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('currentName')}
            className={`flex items-center gap-1 ${
              sortField === 'currentName' 
                ? 'bg-purple-600/30 border-purple-500 text-purple-200' 
                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Name
            {getSortIcon('currentName')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('cityLevel')}
            className={`flex items-center gap-1 ${
              sortField === 'cityLevel' 
                ? 'bg-purple-600/30 border-purple-500 text-purple-200' 
                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Crown className="w-3 h-3" />
            Level
            {getSortIcon('cityLevel')}
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Alliance Filter */}
          <select
            value={allianceFilter}
            onChange={(e) => setAllianceFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Alliances</option>
            <option value="none">No Alliance</option>
            {alliances.map(alliance => (
              <option key={alliance} value={alliance}>{alliance}</option>
            ))}
          </select>

          {/* Active Filter */}
          <label className="flex items-center gap-2 text-gray-300">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
            />
            Active players only
          </label>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>
            Showing {filteredAndSortedPlayers.length} of {players.length} players
            {sortField === 'currentPower' && (
              <span className="ml-2 text-purple-300">
                • Sorted by power ({sortDirection === 'desc' ? 'high to low' : 'low to high'})
              </span>
            )}
          </span>
          {maxSelections && (
            <span>
              Max selections: {maxSelections}
            </span>
          )}
        </div>

        {/* Player Grid */}
        <div className="max-h-96 overflow-y-auto">
          {filteredAndSortedPlayers.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No players match your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAndSortedPlayers.map(player => {
                const isSelected = selectedPlayers.has(player.lordId);
                const isDisabled = disabled || (!isSelected && maxSelections && selectedPlayers.size >= maxSelections);
                
                return (
                  <div
                    key={player.lordId}
                    onClick={() => !isDisabled && handlePlayerToggle(player.lordId)}
                    className={`
                      p-3 rounded-lg border cursor-pointer transition-all duration-200
                      ${isSelected 
                        ? 'bg-purple-600/20 border-purple-500 shadow-lg' 
                        : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500'
                      }
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                      ${player.hasLeftRealm ? 'opacity-75' : ''}
                    `}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-purple-400 flex-shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                          <h4 className="text-white font-medium truncate">
                            {player.currentName}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          ID: {player.lordId}
                        </p>
                      </div>
                      {player.hasLeftRealm && (
                        <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                          Left
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Alliance:</span>
                        {player.allianceTag ? (
                          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                            {player.allianceTag}
                          </Badge>
                        ) : (
                          <span className="text-gray-500">None</span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Power:</span>
                        <span className="text-white font-medium">
                          {formatNumber(player.currentPower)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Level:</span>
                        <span className="text-white">{player.cityLevel}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}