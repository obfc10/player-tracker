/**
 * FilterPanel component for player filtering
 * Simple filter panel with basic functionality
 */

import React from 'react';
import { PlayerSearchFilters } from '@/types/dto';

interface FilterPanelProps {
  filters: PlayerSearchFilters;
  onFiltersChange: (filters: PlayerSearchFilters) => void;
  onReset?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
}

export function FilterPanel({ filters, onFiltersChange, onReset, hasActiveFilters, className = '' }: FilterPanelProps) {
  const handleFilterChange = (key: keyof PlayerSearchFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  return (
    <div className={`bg-white p-4 rounded-lg border shadow-sm ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Filters</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Division Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Division
          </label>
          <select
            value={filters.division || ''}
            onChange={(e) => handleFilterChange('division', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Divisions</option>
            <option value="1">Kings</option>
            <option value="2">Dukes</option>
            <option value="3">Princes</option>
            <option value="4">Marquis</option>
            <option value="5">Counts</option>
            <option value="6">Viscounts</option>
            <option value="7">Barons</option>
          </select>
        </div>

        {/* Alliance Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alliance
          </label>
          <input
            type="text"
            value={filters.alliance || ''}
            onChange={(e) => handleFilterChange('alliance', e.target.value || undefined)}
            placeholder="Alliance name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Min Power Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Min Power
          </label>
          <input
            type="number"
            value={filters.minPower || ''}
            onChange={(e) => handleFilterChange('minPower', e.target.value || undefined)}
            placeholder="Minimum power"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Max Power Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Power
          </label>
          <input
            type="number"
            value={filters.maxPower || ''}
            onChange={(e) => handleFilterChange('maxPower', e.target.value || undefined)}
            placeholder="Maximum power"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Include Left Realm Toggle */}
      <div className="mt-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filters.includeLeftRealm || false}
            onChange={(e) => handleFilterChange('includeLeftRealm', e.target.checked)}
            className="mr-2 rounded"
          />
          <span className="text-sm text-gray-700">Include players who left the realm</span>
        </label>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="mt-4">
          <button
            onClick={onReset || (() => onFiltersChange({}))}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}