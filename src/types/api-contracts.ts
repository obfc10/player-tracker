/**
 * Comprehensive API contract definitions with strict typing
 * This file defines the exact shape of all API requests and responses
 */

import { 
  PlayerListItemDto, 
  PlayerHistoryDto, 
  PlayerSearchFilters,
  SearchResultDto,
  UploadResultDto,
  UploadHistoryDto,
  SnapshotSummaryDto,
  DashboardStatsDto,
  LeaderboardDto,
  ApiResponse,
  PaginatedResponse
} from './dto';

// ===============================
// PLAYER API CONTRACTS
// ===============================

export namespace PlayerAPI {
  // GET /api/data/players
  export interface GetPlayersRequest {
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

  export interface GetPlayersResponse extends ApiResponse<PlayerListItemDto[]> {
    metadata: {
      timestamp: string;
      totalResults: number;
      page: number;
      limit: number;
      totalPages: number;
      filters: PlayerSearchFilters & {
        appliedFilters: string[];
      };
    };
  }

  // GET /api/data/players/[id]
  export interface GetPlayerByIdRequest {
    id: string;
  }

  export interface GetPlayerByIdResponse extends ApiResponse<PlayerHistoryDto> {
    metadata: {
      timestamp: string;
      lordId: string;
      hasHistory: {
        nameChanges: boolean;
        allianceChanges: boolean;
        snapshots: boolean;
      };
    };
  }
}

// ===============================
// SEARCH API CONTRACTS
// ===============================

export namespace SearchAPI {
  // GET /api/search
  export interface GlobalSearchRequest {
    query: string;
    limit?: number;
    includeLeftRealm?: boolean;
    type?: 'players' | 'alliances' | 'all';
  }

  export interface GlobalSearchResponse extends ApiResponse<SearchResultDto> {
    metadata: {
      timestamp: string;
      searchParams: {
        query: string;
        limit: number;
        includeLeftRealm: boolean;
        searchType: string;
      };
      performance: {
        searchDuration: number;
        playersSearched: number;
        playersFound: number;
        alliancesFound: number;
      };
    };
  }
}

// ===============================
// UPLOAD API CONTRACTS
// ===============================

export namespace UploadAPI {
  // POST /api/data/upload
  export interface UploadFileRequest {
    file: File;
  }

  export interface UploadFileResponse extends ApiResponse<UploadResultDto> {
    metadata: {
      timestamp: string;
      uploadId: string;
      processingDuration: number;
    };
  }

  // GET /api/data/upload
  export interface GetUploadHistoryRequest {
    limit?: number;
    offset?: number;
    status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  }

  export interface GetUploadHistoryResponse extends ApiResponse<UploadHistoryDto[]> {
    metadata: {
      timestamp: string;
      pagination: {
        limit: number;
        offset: number;
        hasMore: boolean;
      };
      filters: {
        status?: string;
      };
      stats: {
        total: number;
        completed: number;
        failed: number;
        processing: number;
        successRate: number;
        totalRowsProcessed: number;
        averageRowsPerUpload: number;
      };
    };
  }
}

// ===============================
// SNAPSHOT API CONTRACTS
// ===============================

export namespace SnapshotAPI {
  // GET /api/data/snapshots
  export interface GetSnapshotsRequest {
    limit?: number;
    offset?: number;
    kingdom?: string;
  }

  export interface GetSnapshotsResponse extends ApiResponse<SnapshotSummaryDto[]> {
    metadata: {
      timestamp: string;
      pagination: {
        limit: number;
        offset: number;
        hasMore: boolean;
      };
      filters: {
        kingdom?: string;
      };
    };
  }
}

// ===============================
// DASHBOARD API CONTRACTS
// ===============================

export namespace DashboardAPI {
  // GET /api/dashboard/stats
  export interface GetStatsRequest {
    includeLeftRealm?: boolean;
    topPlayersLimit?: number;
  }

  export interface GetStatsResponse extends ApiResponse<DashboardStatsDto> {
    metadata: {
      timestamp: string;
      dataFreshness: {
        lastUpload: string | null;
        lastSnapshot: string | null;
        cacheAge: number;
      };
    };
  }
}

// ===============================
// LEADERBOARD API CONTRACTS
// ===============================

export namespace LeaderboardAPI {
  // GET /api/leaderboard
  export interface GetLeaderboardRequest {
    includeLeftRealm?: boolean;
    minPower?: string;
    alliance?: string;
    limit?: number;
    sortBy?: 'power' | 'merits';
  }

  export interface GetLeaderboardResponse extends ApiResponse<LeaderboardDto> {
    metadata: {
      timestamp: string;
      snapshot: {
        id: string;
        timestamp: string;
        kingdom: string;
      };
      filters: {
        includeLeftRealm: boolean;
        minPower?: string;
        alliance?: string;
      };
    };
  }
}

// ===============================
// ADMIN API CONTRACTS
// ===============================

export namespace AdminAPI {
  // POST /api/admin/users
  export interface CreateUserRequest {
    username: string;
    password: string;
    name?: string;
    role: 'ADMIN' | 'VIEWER' | 'EVENT_MANAGER';
  }

  export interface CreateUserResponse extends ApiResponse<{
    id: string;
    username: string;
    name: string | null;
    role: string;
    status: string;
    createdAt: string;
  }> {}

  // PUT /api/admin/users/[userId]
  export interface UpdateUserRequest {
    name?: string;
    role?: 'ADMIN' | 'VIEWER' | 'EVENT_MANAGER';
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  }

  export interface UpdateUserResponse extends ApiResponse<{
    id: string;
    username: string;
    name: string | null;
    role: string;
    status: string;
    updatedAt: string;
  }> {}

  // GET /api/admin/users
  export interface GetUsersRequest {
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    role?: 'ADMIN' | 'VIEWER' | 'EVENT_MANAGER';
    limit?: number;
    offset?: number;
  }

  export interface GetUsersResponse extends PaginatedResponse<{
    id: string;
    username: string;
    name: string | null;
    role: string;
    status: string;
    createdAt: string;
    lastLogin?: string;
  }> {}
}

// ===============================
// AUTHENTICATION API CONTRACTS
// ===============================

export namespace AuthAPI {
  // POST /api/auth/register
  export interface RegisterRequest {
    username: string;
    password: string;
    name?: string;
  }

  export interface RegisterResponse extends ApiResponse<{
    message: string;
    user: {
      username: string;
      name: string | null;
      status: 'PENDING';
    };
  }> {}

  // Session information (from NextAuth)
  export interface SessionInfo {
    user: {
      id: string;
      username: string;
      name: string | null;
      role: 'ADMIN' | 'VIEWER' | 'EVENT_MANAGER';
    };
    expires: string;
  }
}

// ===============================
// GENERIC API TYPES
// ===============================

export type APIEndpoint = 
  | 'GET /api/data/players'
  | 'GET /api/data/players/[id]'
  | 'GET /api/search'
  | 'POST /api/data/upload'
  | 'GET /api/data/upload'
  | 'GET /api/data/snapshots'
  | 'GET /api/dashboard/stats'
  | 'GET /api/leaderboard'
  | 'POST /api/admin/users'
  | 'PUT /api/admin/users/[userId]'
  | 'GET /api/admin/users'
  | 'POST /api/auth/register';

export interface APIError {
  success: false;
  error: string;
  metadata: {
    timestamp: string;
    errorCode?: string;
    path?: string;
    method?: string;
    duration?: number;
    stack?: string; // Only in development
    originalMessage?: string; // Only in development
  };
}

// Helper type to extract request type from endpoint
export type RequestType<T extends APIEndpoint> = 
  T extends 'GET /api/data/players' ? PlayerAPI.GetPlayersRequest :
  T extends 'GET /api/data/players/[id]' ? PlayerAPI.GetPlayerByIdRequest :
  T extends 'GET /api/search' ? SearchAPI.GlobalSearchRequest :
  T extends 'POST /api/data/upload' ? UploadAPI.UploadFileRequest :
  T extends 'GET /api/data/upload' ? UploadAPI.GetUploadHistoryRequest :
  T extends 'GET /api/data/snapshots' ? SnapshotAPI.GetSnapshotsRequest :
  T extends 'GET /api/dashboard/stats' ? DashboardAPI.GetStatsRequest :
  T extends 'GET /api/leaderboard' ? LeaderboardAPI.GetLeaderboardRequest :
  T extends 'POST /api/admin/users' ? AdminAPI.CreateUserRequest :
  T extends 'PUT /api/admin/users/[userId]' ? AdminAPI.UpdateUserRequest :
  T extends 'GET /api/admin/users' ? AdminAPI.GetUsersRequest :
  T extends 'POST /api/auth/register' ? AuthAPI.RegisterRequest :
  never;

// Helper type to extract response type from endpoint
export type ResponseType<T extends APIEndpoint> = 
  T extends 'GET /api/data/players' ? PlayerAPI.GetPlayersResponse :
  T extends 'GET /api/data/players/[id]' ? PlayerAPI.GetPlayerByIdResponse :
  T extends 'GET /api/search' ? SearchAPI.GlobalSearchResponse :
  T extends 'POST /api/data/upload' ? UploadAPI.UploadFileResponse :
  T extends 'GET /api/data/upload' ? UploadAPI.GetUploadHistoryResponse :
  T extends 'GET /api/data/snapshots' ? SnapshotAPI.GetSnapshotsResponse :
  T extends 'GET /api/dashboard/stats' ? DashboardAPI.GetStatsResponse :
  T extends 'GET /api/leaderboard' ? LeaderboardAPI.GetLeaderboardResponse :
  T extends 'POST /api/admin/users' ? AdminAPI.CreateUserResponse :
  T extends 'PUT /api/admin/users/[userId]' ? AdminAPI.UpdateUserResponse :
  T extends 'GET /api/admin/users' ? AdminAPI.GetUsersResponse :
  T extends 'POST /api/auth/register' ? AuthAPI.RegisterResponse :
  never;