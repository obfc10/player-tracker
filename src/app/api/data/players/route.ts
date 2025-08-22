import { NextRequest, NextResponse } from 'next/server';
import { PlayerService } from '@/services/PlayerService';
import { PlayerMapper } from '@/mappers/PlayerMapper';
import { withErrorHandling, createSuccessResponse } from '@/lib/enhanced-error-handler';
import { ApiResponse, PlayerListItemDto, PlayerSearchFilters } from '@/types/dto';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getPlayersHandler(request: NextRequest): Promise<NextResponse<ApiResponse<PlayerListItemDto[]>>> {
  const { searchParams } = new URL(request.url);
  
  // Parse search filters from query params
  const filters: PlayerSearchFilters = {
    query: searchParams.get('query') || undefined,
    alliance: searchParams.get('alliance') || undefined,
    minPower: searchParams.get('minPower') || undefined,
    maxPower: searchParams.get('maxPower') || undefined,
    includeLeftRealm: searchParams.get('includeLeftRealm') === 'true',
    division: searchParams.get('division') ? parseInt(searchParams.get('division')!) : undefined,
    faction: searchParams.get('faction') || undefined,
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    sortBy: (searchParams.get('sortBy') as any) || 'power',
    sortOrder: (searchParams.get('sortOrder') as any) || 'desc'
  };
  
  const playerService = new PlayerService();
  
  // Use existing method for now, but will enhance with filtering later
  const result = await playerService.getAllPlayers(filters.includeLeftRealm);
  
  // Transform to DTOs using mapper
  const playersDto = PlayerMapper.toListItems(
    result.players?.map(p => ({
      ...p,
      playerId: p.lordId,
      id: p.lordId,
      snapshotId: 'current'
    } as any)) || []
  );
  
  // Apply client-side filtering for now (will move to service layer)
  let filteredPlayers = playersDto;
  
  if (filters.query) {
    const query = filters.query.toLowerCase();
    filteredPlayers = filteredPlayers.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.lordId.toLowerCase().includes(query) ||
      (p.allianceTag && p.allianceTag.toLowerCase().includes(query))
    );
  }
  
  if (filters.alliance) {
    filteredPlayers = filteredPlayers.filter(p => 
      p.allianceTag === filters.alliance
    );
  }
  
  if (filters.minPower) {
    const minPower = BigInt(filters.minPower);
    filteredPlayers = filteredPlayers.filter(p => 
      BigInt(p.power || '0') >= minPower
    );
  }
  
  if (filters.maxPower) {
    const maxPower = BigInt(filters.maxPower);
    filteredPlayers = filteredPlayers.filter(p => 
      BigInt(p.power || '0') <= maxPower
    );
  }
  
  if (filters.division) {
    filteredPlayers = filteredPlayers.filter(p => 
      p.division === filters.division
    );
  }
  
  if (filters.faction) {
    filteredPlayers = filteredPlayers.filter(p => 
      p.faction === filters.faction
    );
  }
  
  // Apply sorting
  filteredPlayers.sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (filters.sortBy) {
      case 'power':
        aValue = BigInt(a.power || '0');
        bValue = BigInt(b.power || '0');
        break;
      case 'merits':
        aValue = BigInt(a.merits || '0');
        bValue = BigInt(b.merits || '0');
        break;
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'cityLevel':
        aValue = a.cityLevel;
        bValue = b.cityLevel;
        break;
      default:
        aValue = BigInt(a.power || '0');
        bValue = BigInt(b.power || '0');
    }
    
    if (typeof aValue === 'bigint') {
      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    } else {
      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    }
  });
  
  // Apply pagination
  const startIndex = (filters.page! - 1) * filters.limit!;
  const endIndex = startIndex + filters.limit!;
  const paginatedPlayers = filteredPlayers.slice(startIndex, endIndex);
  
  return NextResponse.json(createSuccessResponse(
    paginatedPlayers,
    undefined,
    {
      totalResults: filteredPlayers.length,
      page: filters.page!,
      limit: filters.limit!,
      totalPages: Math.ceil(filteredPlayers.length / filters.limit!),
      filters: {
        ...filters,
        appliedFilters: Object.keys(filters).filter(key => 
          filters[key as keyof PlayerSearchFilters] !== undefined &&
          filters[key as keyof PlayerSearchFilters] !== null &&
          filters[key as keyof PlayerSearchFilters] !== ''
        )
      }
    }
  ));
}

export const GET = withErrorHandling(getPlayersHandler, 'DataPlayersAPI');