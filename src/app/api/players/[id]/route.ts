// src/app/api/players/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PlayerAnalyticsService } from '@/services/PlayerAnalyticsService';
import { apiErrorBoundary, logRequest, logResponse } from '@/lib/error-handler';
import { NotFoundError } from '@/types/api';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getPlayerHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;
  const lordId = id;

  logRequest('GET', `/api/players/${lordId}`);

  const playerAnalyticsService = new PlayerAnalyticsService();
  
  try {
    const result = await playerAnalyticsService.getPlayerAnalysis(lordId);
    
    const duration = Date.now() - startTime;
    logResponse('GET', `/api/players/${lordId}`, 200, duration);
    
    return NextResponse.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error instanceof Error && error.message.includes('not found')) {
      logResponse('GET', `/api/players/${lordId}`, 404, duration);
      throw new NotFoundError('Player', lordId);
    }
    
    logResponse('GET', `/api/players/${lordId}`, 500, duration);
    throw error;
  }
}

export const GET = apiErrorBoundary(getPlayerHandler, 'PlayerAPI');