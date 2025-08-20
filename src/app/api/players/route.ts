import { NextRequest, NextResponse } from 'next/server';
import { PlayerService } from '@/services/PlayerService';
import { apiErrorBoundary, logRequest, logResponse } from '@/lib/error-handler';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getPlayersHandler(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const includeLeftRealm = searchParams.get('includeLeftRealm') === 'true';
  
  logRequest('GET', '/api/players', undefined);
  
  const playerService = new PlayerService();
  const result = await playerService.getAllPlayers(includeLeftRealm);
  
  const duration = Date.now() - startTime;
  logResponse('GET', '/api/players', 200, duration);
  
  return NextResponse.json({
    success: true,
    data: result,
    metadata: {
      timestamp: new Date().toISOString(),
      includeLeftRealm,
      playerCount: result.players?.length || 0
    }
  });
}

export const GET = apiErrorBoundary(getPlayersHandler, 'PlayersAPI');