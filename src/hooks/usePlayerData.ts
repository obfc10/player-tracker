import React, { useCallback } from 'react';
import { useApi, usePaginatedApi } from './useApi';
import { playerAPI, apiClient, APIClientError } from '@/lib/api-client';
import { 
  PlayerListItemDto, 
  PlayerHistoryDto, 
  PlayerSearchFilters,
  SearchResultDto
} from '@/types/dto';
import { PlayerAPI, SearchAPI } from '@/types/api-contracts';

// Type-safe API functions using the API client
const playerApi = {
  async getPlayers(filters: PlayerSearchFilters = {}): Promise<PlayerAPI.GetPlayersResponse> {
    return playerAPI.getAll(filters);
  },

  async getPlayerById(lordId: string): Promise<PlayerAPI.GetPlayerByIdResponse> {
    return playerAPI.getById(lordId);
  },

  async searchPlayers(query: string, options: {
    limit?: number;
    includeLeftRealm?: boolean;
    searchType?: 'players' | 'alliances' | 'all';
  } = {}): Promise<SearchAPI.GlobalSearchResponse> {
    return playerAPI.search(query, options);
  }
};

/**
 * Hook for fetching and managing player list data
 */
export function usePlayerList(initialFilters: PlayerSearchFilters = {}) {
  const apiResult = useApi(
    (filters: PlayerSearchFilters) => playerApi.getPlayers(filters),
    {
      immediate: true
    }
  );

  const refetch = useCallback(
    (newFilters: PlayerSearchFilters = {}) => {
      return apiResult.execute({ ...initialFilters, ...newFilters });
    },
    [apiResult.execute, initialFilters]
  );

  return {
    ...apiResult,
    refetch,
    players: apiResult.data || []
  };
}

/**
 * Hook for paginated player data
 */
export function usePaginatedPlayers(initialFilters: PlayerSearchFilters = {}) {
  const paginatedResult = usePaginatedApi(
    async (page: number, limit: number, filters: PlayerSearchFilters = {}) => {
      return playerApi.getPlayers({ ...filters, page, limit });
    },
    {
      immediate: true,
      initialPage: initialFilters.page || 1,
      initialLimit: initialFilters.limit || 20
    }
  );

  const applyFilters = useCallback(
    (newFilters: PlayerSearchFilters) => {
      return paginatedResult.execute({ ...initialFilters, ...newFilters });
    },
    [paginatedResult.execute, initialFilters]
  );

  return {
    ...paginatedResult,
    applyFilters,
    players: paginatedResult.data || []
  };
}

/**
 * Hook for fetching individual player details
 */
export function usePlayerDetails(lordId: string | null) {
  const apiResult = useApi(
    (id: string) => playerApi.getPlayerById(id),
    {
      immediate: !!lordId
    }
  );

  const fetchPlayer = useCallback(
    (id: string) => {
      return apiResult.execute(id);
    },
    [apiResult.execute]
  );

  return {
    ...apiResult,
    fetchPlayer,
    player: apiResult.data
  };
}

/**
 * Hook for player search functionality
 */
export function usePlayerSearch() {
  const apiResult = useApi(
    (query: string, options: any) => playerApi.searchPlayers(query, options),
    {
      immediate: false
    }
  );

  const search = useCallback(
    (query: string, options: {
      limit?: number;
      includeLeftRealm?: boolean;
      searchType?: 'players' | 'alliances' | 'all';
    } = {}) => {
      if (!query || query.trim().length < 2) {
        return Promise.reject(new Error('Search query must be at least 2 characters long'));
      }
      return apiResult.execute(query.trim(), options);
    },
    [apiResult.execute]
  );

  return {
    ...apiResult,
    search,
    results: apiResult.data,
    searchPlayers: (query: string, options?: any) => search(query, { ...options, searchType: 'players' }),
    searchAlliances: (query: string, options?: any) => search(query, { ...options, searchType: 'alliances' }),
    searchAll: (query: string, options?: any) => search(query, { ...options, searchType: 'all' })
  };
}

/**
 * Hook for managing player filters with local state
 */
export function usePlayerFilters(initialFilters: PlayerSearchFilters = {}) {
  const [filters, setFilters] = React.useState<PlayerSearchFilters>(initialFilters);
  
  const updateFilter = useCallback((key: keyof PlayerSearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateFilters = useCallback((newFilters: Partial<PlayerSearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const clearFilter = useCallback((key: keyof PlayerSearchFilters) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    clearFilter,
    hasActiveFilters: Object.keys(filters).some(key => 
      filters[key as keyof PlayerSearchFilters] !== undefined &&
      filters[key as keyof PlayerSearchFilters] !== null &&
      filters[key as keyof PlayerSearchFilters] !== ''
    )
  };
}

/**
 * Hook for player statistics and metrics
 */
export function usePlayerStats(players: PlayerListItemDto[]) {
  const stats = React.useMemo(() => {
    if (!players || players.length === 0) {
      return {
        totalPlayers: 0,
        activePlayers: 0,
        leftRealmPlayers: 0,
        totalPower: '0',
        averagePower: '0',
        totalMerits: '0',
        averageMerits: '0',
        topPlayerByPower: null,
        topPlayerByMerits: null,
        allianceCount: 0,
        factionDistribution: {}
      };
    }

    const activePlayers = players.filter(p => !p.hasLeftRealm);
    const leftRealmPlayers = players.filter(p => p.hasLeftRealm);
    
    const totalPower = players.reduce((sum, p) => sum + BigInt(p.power || '0'), BigInt(0));
    const totalMerits = players.reduce((sum, p) => sum + BigInt(p.merits || '0'), BigInt(0));
    
    const topPlayerByPower = players.reduce((top, p) => 
      !top || BigInt(p.power || '0') > BigInt(top.power || '0') ? p : top, 
      null as PlayerListItemDto | null
    );
    
    const topPlayerByMerits = players.reduce((top, p) => 
      !top || BigInt(p.merits || '0') > BigInt(top.merits || '0') ? p : top,
      null as PlayerListItemDto | null
    );

    const uniqueAlliances = new Set(players.map(p => p.allianceTag).filter(Boolean));
    
    const factionDistribution = players.reduce((dist, p) => {
      const faction = p.faction || 'Unknown';
      dist[faction] = (dist[faction] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    return {
      totalPlayers: players.length,
      activePlayers: activePlayers.length,
      leftRealmPlayers: leftRealmPlayers.length,
      totalPower: totalPower.toString(),
      averagePower: players.length > 0 ? (totalPower / BigInt(players.length)).toString() : '0',
      totalMerits: totalMerits.toString(),
      averageMerits: players.length > 0 ? (totalMerits / BigInt(players.length)).toString() : '0',
      topPlayerByPower,
      topPlayerByMerits,
      allianceCount: uniqueAlliances.size,
      factionDistribution
    };
  }, [players]);

  return stats;
}