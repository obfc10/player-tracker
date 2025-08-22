import { NextRequest, NextResponse } from 'next/server';
import { SnapshotRepository } from '@/repositories/SnapshotRepository';
import { SnapshotMapper } from '@/mappers/SnapshotMapper';
import { withErrorHandling, createSuccessResponse } from '@/lib/enhanced-error-handler';
import { ApiResponse, SnapshotSummaryDto } from '@/types/dto';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getSnapshotsHandler(request: NextRequest): Promise<NextResponse<ApiResponse<SnapshotSummaryDto[]>>> {
  const { searchParams } = new URL(request.url);
  
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
  const kingdom = searchParams.get('kingdom') || undefined;
  
  const snapshotRepository = new SnapshotRepository();
  
  // Get snapshots with basic info
  const snapshots = await snapshotRepository.findMany({
    limit,
    offset,
    kingdom,
    includePlayerCounts: true
  });
  
  // Transform to DTOs
  const snapshotDtos = snapshots.map(snapshot => 
    SnapshotMapper.toSummary(
      snapshot,
      snapshot.playerCount || 0,
      { nameChanges: 0, allianceChanges: 0 }, // TODO: Add change counts
      0 // TODO: Add left realm count
    )
  );
  
  return NextResponse.json(createSuccessResponse(
    snapshotDtos,
    undefined,
    {
      pagination: {
        limit,
        offset,
        hasMore: snapshotDtos.length === limit
      },
      filters: { kingdom }
    }
  ));
}

export const GET = withErrorHandling(getSnapshotsHandler, 'DataSnapshotsAPI');