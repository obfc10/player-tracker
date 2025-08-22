import { Snapshot, Upload, User } from '@prisma/client';
import { ProcessedSnapshot } from '@/types/snapshot';
import { 
  SnapshotSummaryDto, 
  UploadResultDto, 
  UploadHistoryDto 
} from '@/types/dto';

export class SnapshotMapper {
  /**
   * Convert Snapshot to SnapshotSummaryDto
   */
  static toSummary(
    snapshot: Snapshot,
    playersProcessed: number = 0,
    changesDetected: { nameChanges: number; allianceChanges: number } = { nameChanges: 0, allianceChanges: 0 },
    playersMarkedAsLeft: number = 0
  ): SnapshotSummaryDto {
    return {
      id: snapshot.id,
      timestamp: snapshot.timestamp.toISOString(),
      filename: snapshot.filename,
      kingdom: snapshot.kingdom,
      playersProcessed,
      changesDetected,
      playersMarkedAsLeft
    };
  }

  /**
   * Convert ProcessedSnapshot to UploadResultDto
   */
  static toUploadResult(processedSnapshot: ProcessedSnapshot): UploadResultDto {
    return {
      snapshotId: processedSnapshot.snapshot.id,
      timestamp: processedSnapshot.snapshot.timestamp.toISOString(),
      rowsProcessed: processedSnapshot.playersProcessed,
      changesDetected: {
        nameChanges: processedSnapshot.changesDetected.nameChanges,
        allianceChanges: processedSnapshot.changesDetected.allianceChanges
      },
      playersMarkedAsLeft: processedSnapshot.playersMarkedAsLeft
    };
  }

  /**
   * Convert Upload with user info to UploadHistoryDto
   */
  static toUploadHistory(
    upload: Upload & { uploadedBy: User }
  ): UploadHistoryDto {
    return {
      id: upload.id,
      filename: upload.filename,
      status: upload.status,
      error: upload.error || undefined,
      rowsProcessed: upload.rowsProcessed,
      createdAt: upload.createdAt.toISOString(),
      uploadedBy: {
        id: upload.uploadedBy.id,
        username: upload.uploadedBy.username,
        name: upload.uploadedBy.name
      }
    };
  }

  /**
   * Convert array of uploads to history DTOs
   */
  static toUploadHistoryList(
    uploads: (Upload & { uploadedBy: User })[]
  ): UploadHistoryDto[] {
    return uploads.map(upload => this.toUploadHistory(upload));
  }

  /**
   * Convert upload processing statistics
   */
  static createUploadStats(uploads: Upload[]) {
    const total = uploads.length;
    const completed = uploads.filter(u => u.status === 'COMPLETED').length;
    const failed = uploads.filter(u => u.status === 'FAILED').length;
    const processing = uploads.filter(u => u.status === 'PROCESSING').length;
    const totalRowsProcessed = uploads
      .filter(u => u.status === 'COMPLETED')
      .reduce((sum, u) => sum + u.rowsProcessed, 0);

    return {
      total,
      completed,
      failed,
      processing,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      totalRowsProcessed,
      averageRowsPerUpload: completed > 0 ? Math.round(totalRowsProcessed / completed) : 0
    };
  }
}