'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, Shield, Loader2, ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SearchResult {
  type: 'player' | 'alliance';
  id: string;
  title: string;
  subtitle: string;
  power?: number;
  memberCount?: number;
  url: string;
  relevance: number;
}

interface SearchResponse {
  results: SearchResult[];
  query: string;
  totalResults: number;
  snapshotInfo?: {
    id: string;
    timestamp: string;
    kingdom: string;
    filename: string;
  };
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('playerTracker-recentSearches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading recent searches:', e);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = (searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('playerTracker-recentSearches', JSON.stringify(updated));
  };

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else {
      setResults([]);
      setIsLoading(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (searchQuery: string) => {
    if (searchQuery.length < 2) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/search/global?q=${encodeURIComponent(searchQuery)}&limit=15`);
      if (response.ok) {
        const data: SearchResponse = await response.json();
        setResults(data.results);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);
    
    if (value.length >= 2) {
      setIsLoading(true);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(query);
    setIsOpen(false);
    setQuery('');
    router.push(result.url);
  };

  const handleRecentSearchClick = (recentQuery: string) => {
    setQuery(recentQuery);
    setIsOpen(true);
    performSearch(recentQuery);
    inputRef.current?.focus();
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('playerTracker-recentSearches');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Enter' && results.length > 0) {
      handleResultClick(results[0]);
    }
  };

  const getResultIcon = (result: SearchResult) => {
    return result.type === 'player' ? 
      <Users className="w-4 h-4 text-blue-400" /> : 
      <Shield className="w-4 h-4 text-purple-400" />;
  };

  const getResultBadge = (result: SearchResult) => {
    if (result.type === 'player') {
      return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">Player</Badge>;
    } else {
      return <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">Alliance</Badge>;
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search players, alliances, or IDs..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
        )}
      </div>

      {/* Search Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
          {query.length < 2 && recentSearches.length > 0 && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Recent Searches
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearRecentSearches}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Clear
                </Button>
              </div>
              <div className="space-y-1">
                {recentSearches.map((recentQuery, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearchClick(recentQuery)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
                  >
                    {recentQuery}
                  </button>
                ))}
              </div>
            </div>
          )}

          {query.length >= 2 && (
            <>
              {isLoading ? (
                <div className="p-4 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-500" />
                  <p className="text-sm text-gray-400">Searching...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="max-h-80 overflow-y-auto">
                  <div className="p-2">
                    <p className="text-xs text-gray-400 mb-2 px-2">
                      Found {results.length} result{results.length !== 1 ? 's' : ''} for &quot;{query}&quot;
                    </p>
                    {results.map((result, index) => (
                      <button
                        key={`${result.type}-${result.id}-${index}`}
                        onClick={() => handleResultClick(result)}
                        className="w-full text-left px-3 py-3 hover:bg-gray-700 rounded-lg transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          {getResultIcon(result)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-white font-medium truncate">{result.title}</p>
                              {getResultBadge(result)}
                            </div>
                            <p className="text-sm text-gray-400 truncate">{result.subtitle}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : query.length >= 2 ? (
                <div className="p-4 text-center">
                  <Search className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No results found for &quot;{query}&quot;</p>
                  <p className="text-xs text-gray-500 mt-1">Try searching by player name, alliance tag, or player ID</p>
                </div>
              ) : null}
            </>
          )}

          {query.length < 2 && recentSearches.length === 0 && (
            <div className="p-4 text-center">
              <Search className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Start typing to search</p>
              <p className="text-xs text-gray-500 mt-1">Search players, alliances, or player IDs</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}