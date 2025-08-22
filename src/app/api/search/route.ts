import { NextRequest, NextResponse } from 'next/server';
import { PlayerService } from '@/services/PlayerService';
import { PlayerMapper } from '@/mappers/PlayerMapper';
import { apiErrorBoundary, logRequest, logResponse } from '@/lib/error-handler';
import { ValidationError } from '@/types/api';
import { ApiResponse, SearchResultDto, AllianceDto } from '@/types/dto';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function globalSearchHandler(request: NextRequest): Promise<NextResponse<ApiResponse<SearchResultDto>>> {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  
  const query = searchParams.get('query');
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
  const includeLeftRealm = searchParams.get('includeLeftRealm') === 'true';
  const searchType = searchParams.get('type') || 'all'; // 'players', 'alliances', 'all'
  
  if (!query || query.trim().length < 2) {
    throw new ValidationError('Search query must be at least 2 characters long');
  }
  
  logRequest('GET', '/api/search', undefined);
  
  const playerService = new PlayerService();
  
  // Get all players for searching
  const result = await playerService.getAllPlayers(includeLeftRealm);
  
  // Transform to DTOs
  const allPlayers = PlayerMapper.toListItems(
    result.players?.map(p => ({
      ...p,
      playerId: p.lordId,
      id: p.lordId,
      snapshotId: 'current'
    } as any)) || []
  );
  
  const queryLower = query.toLowerCase().trim();
  
  // Search players
  let matchingPlayers: typeof allPlayers = [];
  if (searchType === 'players' || searchType === 'all') {
    matchingPlayers = allPlayers.filter(player => {
      return (
        player.name.toLowerCase().includes(queryLower) ||
        player.lordId.toLowerCase().includes(queryLower) ||
        (player.allianceTag && player.allianceTag.toLowerCase().includes(queryLower))
      );
    }).slice(0, limit);
  }
  
  // Search and aggregate alliances
  let matchingAlliances: AllianceDto[] = [];
  if (searchType === 'alliances' || searchType === 'all') {
    const allianceMap = new Map<string, {
      tag: string;
      members: typeof allPlayers;
      totalPower: bigint;
    }>();
    
    // Group players by alliance
    allPlayers.forEach(player => {
      if (player.allianceTag && player.allianceTag.toLowerCase().includes(queryLower)) {
        const key = player.allianceTag.toLowerCase();
        if (!allianceMap.has(key)) {
          allianceMap.set(key, {
            tag: player.allianceTag,
            members: [],
            totalPower: BigInt(0)
          });
        }
        
        const alliance = allianceMap.get(key)!;
        alliance.members.push(player);
        alliance.totalPower += BigInt(player.power || '0');
      }
    });
    
    // Convert to DTOs
    matchingAlliances = Array.from(allianceMap.values())
      .map(alliance => ({
        id: alliance.tag.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        tag: alliance.tag,
        memberCount: alliance.members.length,
        totalPower: alliance.totalPower.toString(),
        averagePower: alliance.members.length > 0 
          ? (alliance.totalPower / BigInt(alliance.members.length)).toString()
          : '0'
      }))
      .sort((a, b) => Number(BigInt(b.totalPower) - BigInt(a.totalPower)))
      .slice(0, Math.floor(limit / 2)); // Reserve some space for players
  }
  
  const searchResult: SearchResultDto = {
    players: matchingPlayers,
    alliances: matchingAlliances,
    totalResults: matchingPlayers.length + matchingAlliances.length,
    query
  };
  
  const duration = Date.now() - startTime;
  logResponse('GET', '/api/search', 200, duration);
  
  return NextResponse.json({
    success: true,
    data: searchResult,
    metadata: {
      timestamp: new Date().toISOString(),
      searchParams: {
        query,
        limit,
        includeLeftRealm,
        searchType
      },
      performance: {
        searchDuration: duration,
        playersSearched: allPlayers.length,
        playersFound: matchingPlayers.length,
        alliancesFound: matchingAlliances.length
      }
    }
  });
}

export const GET = apiErrorBoundary(globalSearchHandler, 'GlobalSearchAPI');