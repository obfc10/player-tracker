'use client';

import React, { useState } from 'react';
import { usePlayerList, usePlayerFilters } from '@/hooks/usePlayerData';
import { PlayerListCard } from '@/components/ui/PlayerCard';
import { SearchInput } from '@/components/ui/SearchInput';
import { FilterPanel } from '@/components/ui/FilterPanel';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Pagination } from '@/components/ui/Pagination';
import { PlayerListItemDto } from '@/types/dto';

interface PlayerListViewProps {
  initialFilters?: {
    includeLeftRealm?: boolean;
    alliance?: string;
    minPower?: string;
  };
  showFilters?: boolean;
  pageSize?: number;
  onPlayerSelect?: (player: PlayerListItemDto) => void;
}

export function PlayerListView({ 
  initialFilters = {}, 
  showFilters = true,
  pageSize = 20,
  onPlayerSelect 
}: PlayerListViewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  
  const { 
    filters, 
    updateFilter, 
    updateFilters, 
    resetFilters,
    hasActiveFilters 
  } = usePlayerFilters({
    ...initialFilters,
    page: currentPage,
    limit: pageSize
  });

  const { 
    players, 
    loading, 
    error, 
    refetch 
  } = usePlayerList(filters);

  const handleSearch = (query: string) => {
    updateFilter('query', query);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleFilterChange = (newFilters: any) => {
    updateFilters(newFilters);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateFilter('page', page);
  };

  const handlePlayerClick = (player: PlayerListItemDto) => {
    if (onPlayerSelect) {
      onPlayerSelect(player);
    }
  };

  if (error) {
    return (
      <ErrorMessage 
        message={`Failed to load players: ${error.message}`}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col space-y-4">
        <SearchInput
          placeholder="Search players by name, ID, or alliance..."
          value={filters.query || ''}
          onChange={handleSearch}
          loading={loading}
        />
        
        {showFilters && (
          <FilterPanel
            filters={filters}
            onFiltersChange={handleFilterChange}
            onReset={resetFilters}
            hasActiveFilters={hasActiveFilters}
          />
        )}
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center text-sm text-gray-400">
        <span>
          {loading ? 'Loading...' : `${players.length} players found`}
          {hasActiveFilters && (
            <span className="ml-2">
              (filtered)
            </span>
          )}
        </span>
        
        <div className="flex items-center space-x-2">
          <span>Sort by:</span>
          <select
            value={filters.sortBy || 'power'}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
          >
            <option value="power">Power</option>
            <option value="merits">Merits</option>
            <option value="name">Name</option>
            <option value="cityLevel">City Level</option>
          </select>
          
          <button
            onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded hover:bg-gray-600"
          >
            {filters.sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Player Grid */}
      {!loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {players.map((player) => (
              <PlayerListCard
                key={player.lordId}
                player={player}
                onClick={() => handlePlayerClick(player)}
                showMetrics={true}
                compact={true}
              />
            ))}
          </div>

          {/* Empty State */}
          {players.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No players found</p>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="mt-2 text-blue-400 hover:text-blue-300 underline"
                >
                  Clear filters to see all players
                </button>
              )}
            </div>
          )}

          {/* Pagination */}
          {players.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(players.length / pageSize)}
              onPageChange={handlePageChange}
              totalItems={players.length}
              itemsPerPage={pageSize}
            />
          )}
        </>
      )}
    </div>
  );
}