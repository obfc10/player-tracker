/**
 * Data Transfer Objects (DTOs) for API responses
 * Defines the shape of data sent to/from the API
 */

// Base response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: {
    timestamp: string;
    [key: string]: any;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Player DTOs
export interface PlayerListItemDto {
  lordId: string;
  name: string;
  division: number;
  allianceTag: string | null;
  currentPower: string;
  power: string;
  merits: string;
  cityLevel: number;
  faction: string | null;
  hasLeftRealm?: boolean;
  lastSeenAt?: string;
}

export interface PlayerDetailDto extends PlayerListItemDto {
  unitsKilled: string;
  unitsDead: string;
  unitsHealed: string;
  t1KillCount: string;
  t2KillCount: string;
  t3KillCount: string;
  t4KillCount: string;
  t5KillCount: string;
  buildingPower: string;
  heroPower: string;
  legionPower: string;
  techPower: string;
  victories: number;
  defeats: number;
  citySieges: number;
  scouted: number;
  helpsGiven: number;
  gold: string;
  goldSpent: string;
  wood: string;
  woodSpent: string;
  ore: string;
  oreSpent: string;
  mana: string;
  manaSpent: string;
  gems: string;
  gemsSpent: string;
  resourcesGiven: string;
  resourcesGivenCount: number;
  allianceId: string | null;
}

export interface PlayerHistoryDto {
  player: PlayerDetailDto;
  nameHistory: NameChangeDto[];
  allianceHistory: AllianceChangeDto[];
  snapshots: PlayerSnapshotDto[];
}

// Change tracking DTOs
export interface NameChangeDto {
  id: string;
  oldName: string;
  newName: string;
  detectedAt: string;
}

export interface AllianceChangeDto {
  id: string;
  oldAlliance: string | null;
  oldAllianceId: string | null;
  newAlliance: string | null;
  newAllianceId: string | null;
  detectedAt: string;
}

// Snapshot DTOs
export interface PlayerSnapshotDto {
  id: string;
  timestamp: string;
  filename: string;
  kingdom: string;
  playerData: PlayerDetailDto;
}

export interface SnapshotSummaryDto {
  id: string;
  timestamp: string;
  filename: string;
  kingdom: string;
  playersProcessed: number;
  changesDetected: {
    nameChanges: number;
    allianceChanges: number;
  };
  playersMarkedAsLeft: number;
}

// Upload DTOs
export interface UploadResultDto {
  snapshotId: string;
  timestamp: string;
  rowsProcessed: number;
  changesDetected: {
    nameChanges: number;
    allianceChanges: number;
  };
  playersMarkedAsLeft: number;
}

export interface UploadHistoryDto {
  id: string;
  filename: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  error?: string;
  rowsProcessed: number;
  createdAt: string;
  uploadedBy: {
    id: string;
    username: string;
    name: string | null;
  };
}

// Search DTOs
export interface SearchResultDto {
  players: PlayerListItemDto[];
  alliances: AllianceDto[];
  totalResults: number;
  query: string;
}

export interface AllianceDto {
  id: string;
  tag: string;
  memberCount: number;
  totalPower: string;
  averagePower: string;
}

// Event DTOs
export interface EventDto {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  description?: string;
  isActive: boolean;
  participantCount: number;
  teamCount: number;
}

export interface EventParticipantDto {
  playerId: string;
  playerName: string;
  joinedAt: string;
  leftAt?: string;
  teamId?: string;
  teamName?: string;
  notes?: string;
}

// Statistics DTOs
export interface DashboardStatsDto {
  totalPlayers: number;
  activePlayers: number;
  playersLeftRealm: number;
  totalAlliances: number;
  lastUploadDate?: string;
  topPlayersByPower: PlayerListItemDto[];
  topPlayersByMerits: PlayerListItemDto[];
  recentChanges: {
    nameChanges: NameChangeDto[];
    allianceChanges: AllianceChangeDto[];
  };
}

// Leaderboard DTOs
export interface LeaderboardDto {
  players: PlayerListItemDto[];
  alliances: AllianceDto[];
  filters: {
    includeLeftRealm: boolean;
    minPower?: string;
    alliance?: string;
  };
}

// Request DTOs
export interface PlayerSearchFilters {
  query?: string;
  alliance?: string;
  minPower?: string;
  maxPower?: string;
  includeLeftRealm?: boolean;
  division?: number;
  faction?: string;
  page?: number;
  limit?: number;
  sortBy?: 'power' | 'merits' | 'name' | 'cityLevel';
  sortOrder?: 'asc' | 'desc';
}

export interface UploadFileRequest {
  file: File;
}

// Error DTOs
export interface ValidationErrorDto {
  field: string;
  message: string;
  value?: any;
}

export interface ApiErrorDto {
  code: string;
  message: string;
  details?: ValidationErrorDto[];
  timestamp: string;
  path?: string;
}