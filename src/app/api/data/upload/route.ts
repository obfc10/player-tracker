import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PlayerService } from '@/services/PlayerService';
import { SnapshotMapper } from '@/mappers/SnapshotMapper';
import { requireAdminAuth } from '@/lib/api-utils';
import { ValidationError } from '@/types/api';
import { apiErrorBoundary, logRequest, logResponse } from '@/lib/error-handler';
import { logInfo, logError, logWarn } from '@/lib/logger';
import { ApiResponse, UploadResultDto, UploadHistoryDto } from '@/types/dto';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function uploadHandler(request: NextRequest): Promise<NextResponse<ApiResponse<UploadResultDto>>> {
  const startTime = Date.now();
  
  // Check authentication
  const session = await requireAdminAuth();
  logRequest('POST', '/api/data/upload', session.user.id);

  // Get file from form data
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    throw new ValidationError('No file provided');
  }

  logInfo('Upload', 'File upload initiated', {
    filename: file.name,
    fileSize: file.size,
    userId: session.user.id
  });

  // Verify user exists in database
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id }
  });
  
  if (!dbUser) {
    logWarn('Upload', 'User not found in database, trying username fallback', {
      userId: session.user.id,
      username: session.user.username
    });
    
    // Try to find by username as fallback
    const userByUsername = await prisma.user.findUnique({
      where: { username: session.user.username! }
    });
    
    if (userByUsername) {
      logInfo('Upload', 'Found user by username, updating session', {
        originalId: session.user.id,
        foundId: userByUsername.id
      });
      session.user.id = userByUsername.id;
    } else {
      throw new ValidationError('User not found in database. Please log out and log back in.');
    }
  }

  // Create upload record
  logInfo('Upload', 'Creating upload record', { userId: session.user.id });
  const upload = await prisma.upload.create({
    data: {
      filename: file.name,
      userId: session.user.id,
      status: 'PROCESSING'
    }
  });

  try {
    // Process upload using PlayerService
    const playerService = new PlayerService();
    const result = await playerService.processUpload(file, upload.id);
    
    // Update upload status
    await prisma.upload.update({
      where: { id: upload.id },
      data: {
        status: 'COMPLETED',
        rowsProcessed: result.snapshot.playersProcessed
      }
    });

    const duration = Date.now() - startTime;
    logResponse('POST', '/api/data/upload', 200, duration);
    
    logInfo('Upload', 'Upload processing completed successfully', {
      uploadId: upload.id,
      snapshotId: result.snapshot.snapshot.id,
      playersProcessed: result.snapshot.playersProcessed,
      duration
    });

    // Transform to DTO using mapper
    const uploadResultDto = SnapshotMapper.toUploadResult(result.snapshot);

    return NextResponse.json({
      success: true,
      data: uploadResultDto,
      message: result.message,
      metadata: {
        timestamp: new Date().toISOString(),
        uploadId: upload.id,
        processingDuration: duration
      }
    });

  } catch (error) {
    // Update upload with error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await prisma.upload.update({
      where: { id: upload.id },
      data: {
        status: 'FAILED',
        error: errorMessage
      }
    });

    const duration = Date.now() - startTime;
    logError('Upload', 'Upload processing failed', error as Error, {
      uploadId: upload.id,
      filename: file.name,
      duration
    });

    throw error;
  }
}

async function getUploadHistoryHandler(request: NextRequest): Promise<NextResponse<ApiResponse<UploadHistoryDto[]>>> {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
  const status = searchParams.get('status') as 'PROCESSING' | 'COMPLETED' | 'FAILED' | undefined;
  
  logRequest('GET', '/api/data/upload', undefined);
  
  // Get upload history
  const uploads = await prisma.upload.findMany({
    where: status ? { status } : undefined,
    include: {
      uploadedBy: true
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset
  });
  
  // Transform to DTOs using mapper
  const uploadHistoryDtos = SnapshotMapper.toUploadHistoryList(uploads);
  
  const duration = Date.now() - startTime;
  logResponse('GET', '/api/data/upload', 200, duration);
  
  return NextResponse.json({
    success: true,
    data: uploadHistoryDtos,
    metadata: {
      timestamp: new Date().toISOString(),
      pagination: {
        limit,
        offset,
        hasMore: uploads.length === limit
      },
      filters: { status },
      stats: SnapshotMapper.createUploadStats(uploads)
    }
  });
}

export const POST = apiErrorBoundary(uploadHandler, 'DataUploadAPI');
export const GET = apiErrorBoundary(getUploadHistoryHandler, 'DataUploadHistoryAPI');