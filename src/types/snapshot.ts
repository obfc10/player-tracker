// Snapshot-related types
export interface Snapshot {
  id: string;
  timestamp: Date;
  filename: string;
  kingdom: string;
  uploadId: string;
  createdAt: Date;
  seasonId: string | null;
}

export interface SnapshotWithMetadata extends Snapshot {
  playerCount?: number;
  season?: {
    id: string;
    name: string;
    isActive: boolean;
  };
  upload?: {
    id: string;
    status: string;
    uploadedBy: {
      username: string;
      name?: string;
    };
  };
}

export interface ProcessedSnapshot {
  snapshot: Snapshot;
  playersProcessed: number;
  changesDetected: {
    nameChanges: number;
    allianceChanges: number;
  };
  playersMarkedAsLeft: number;
}