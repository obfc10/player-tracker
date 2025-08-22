import { NextRequest, NextResponse } from 'next/server';
import { PlayerService } from '@/services/PlayerService';
import { PlayerMapper } from '@/mappers/PlayerMapper';
import { withErrorHandling, createSuccessResponse, createErrorResponse } from '@/lib/enhanced-error-handler';
import { ValidationError } from '@/types/api';
import { ApiResponse, PlayerHistoryDto } from '@/types/dto';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getPlayerHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<PlayerHistoryDto>>> {
  const startTime = Date.now();
  const params = await context.params;
  const { id: lordId } = params;
  
  if (!lordId) {
    throw new ValidationError('Player ID is required');
  }
  
  const playerService = new PlayerService();
  const playerWithHistory = await playerService.getPlayerById(lordId);
  
  if (!playerWithHistory) {
    return NextResponse.json(createErrorResponse(
      'Player not found'
    ), { status: 404 });
  }
  
  // Transform to DTO using mapper
  const playerHistoryDto = PlayerMapper.toHistory(playerWithHistory);
  
  return NextResponse.json(createSuccessResponse(
    playerHistoryDto,
    undefined,
    {
      lordId,
      hasHistory: {
        nameChanges: playerHistoryDto.nameHistory.length > 0,
        allianceChanges: playerHistoryDto.allianceHistory.length > 0,
        snapshots: playerHistoryDto.snapshots.length > 0
      }
    }
  ));
}

export const GET = withErrorHandling(getPlayerHandler, 'DataPlayerByIdAPI');