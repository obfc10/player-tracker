'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorstPerformersTracker } from '@/components/business/WorstPerformersTracker';
import { PlayerDetailDto } from '@/types/dto';
import { getManagedAllianceTags } from '@/lib/alliance-config';

export default function WorstPerformersPage() {
  const router = useRouter();
  const [allPlayers, setAllPlayers] = useState<PlayerDetailDto[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerDetailDto[]>([]);
  const [selectedAlliance, setSelectedAlliance] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all players from the API
      const response = await fetch('/api/players');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch players');
      }
      
      // Get all players and filter to only include managed alliance players
      const managedTags = getManagedAllianceTags();
      const managedPlayers = (data.data?.players || []).filter((player: any) =>
        player.allianceTag && managedTags.includes(player.allianceTag)
      );
      
      setAllPlayers(managedPlayers);
      setFilteredPlayers(managedPlayers); // Initially show all managed players
    } catch (error) {
      console.error('Error fetching players:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch players');
    } finally {
      setLoading(false);
    }
  };

  // Filter players based on selected alliance
  const handleAllianceChange = (alliance: string) => {
    setSelectedAlliance(alliance);
    
    if (alliance === 'all') {
      setFilteredPlayers(allPlayers);
    } else {
      const filtered = allPlayers.filter(player => player.allianceTag === alliance);
      setFilteredPlayers(filtered);
    }
  };

  const handlePlayerSelect = (playerId: string) => {
    // Navigate to the player detail page
    router.push(`/dashboard/player/${playerId}`);
  };

  // Get unique alliance tags from the players (filter out null/undefined values)
  const availableAlliances = Array.from(new Set(
    allPlayers.map(p => p.allianceTag).filter((tag): tag is string => Boolean(tag))
  ));

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <h3 className="text-red-400 font-semibold mb-2">Error Loading Data</h3>
          <p className="text-red-300">{error}</p>
          <button
            onClick={fetchPlayers}
            className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Worst Performers Tracker</h1>
            <p className="text-gray-300">
              Monitor and track underperforming players across managed alliances
            </p>
          </div>
          
          {/* Alliance Filter Dropdown */}
          <div className="flex flex-col sm:items-end">
            <label className="block text-sm font-medium text-white mb-2">
              Filter by Alliance
            </label>
            <select
              value={selectedAlliance}
              onChange={(e) => handleAllianceChange(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent min-w-[150px]"
            >
              <option value="all">All Alliances ({allPlayers.length})</option>
              {availableAlliances.map(alliance => {
                const count = allPlayers.filter(p => p.allianceTag === alliance).length;
                return (
                  <option key={alliance} value={alliance}>
                    {alliance} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <p className="text-white">
            Analyzing <span className="font-semibold text-purple-400">{filteredPlayers.length}</span> players
            {selectedAlliance !== 'all' && (
              <span className="text-gray-300"> from {selectedAlliance}</span>
            )}
          </p>
          {selectedAlliance !== 'all' && (
            <button
              onClick={() => handleAllianceChange('all')}
              className="text-purple-400 hover:text-purple-300 underline"
            >
              Show all alliances
            </button>
          )}
        </div>
      </div>
      
      <WorstPerformersTracker
        players={filteredPlayers}
        onPlayerSelect={handlePlayerSelect}
      />
    </div>
  );
}