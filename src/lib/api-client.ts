/**
 * Type-safe API client with comprehensive error handling
 */

import { 
  APIEndpoint, 
  RequestType, 
  ResponseType, 
  APIError 
} from '@/types/api-contracts';

export class APIClientError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string,
    public response?: any
  ) {
    super(message);
    this.name = 'APIClientError';
  }
}

export class APIClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = '', defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    };
  }

  /**
   * Generic request method with full type safety
   */
  private async request<TEndpoint extends APIEndpoint>(
    endpoint: TEndpoint,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    options: {
      body?: RequestType<TEndpoint>;
      headers?: Record<string, string>;
      params?: Record<string, string | number | boolean | undefined>;
    } = {}
  ): Promise<ResponseType<TEndpoint>> {
    const { body, headers = {}, params = {} } = options;

    // Build URL with query parameters
    let url = `${this.baseUrl}${path}`;
    if (Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: {
        ...this.defaultHeaders,
        ...headers
      }
    };

    // Handle body based on content type
    if (body) {
      if (body instanceof FormData) {
        // Remove Content-Type header for FormData (browser will set it with boundary)
        const headers = requestOptions.headers as Record<string, string>;
        delete headers['Content-Type'];
        requestOptions.body = body;
      } else {
        requestOptions.body = JSON.stringify(body);
      }
    }

    try {
      const response = await fetch(url, requestOptions);
      const data = await response.json();

      if (!response.ok) {
        const apiError = data as APIError;
        throw new APIClientError(
          response.status,
          apiError.metadata?.errorCode || 'UNKNOWN_ERROR',
          apiError.error || 'An error occurred',
          data
        );
      }

      return data as ResponseType<TEndpoint>;
    } catch (error) {
      if (error instanceof APIClientError) {
        throw error;
      }

      // Handle network errors or JSON parsing errors
      throw new APIClientError(
        0,
        'NETWORK_ERROR',
        error instanceof Error ? error.message : 'Network error occurred'
      );
    }
  }

  // ===============================
  // PLAYER API METHODS
  // ===============================

  async getPlayers(params: RequestType<'GET /api/data/players'> = {}) {
    return this.request(
      'GET /api/data/players',
      'GET',
      '/api/data/players',
      { params: params as any }
    );
  }

  async getPlayerById(id: string) {
    return this.request(
      'GET /api/data/players/[id]',
      'GET',
      `/api/data/players/${encodeURIComponent(id)}`
    );
  }

  // ===============================
  // SEARCH API METHODS
  // ===============================

  async globalSearch(params: RequestType<'GET /api/search'>) {
    return this.request(
      'GET /api/search',
      'GET',
      '/api/search',
      { params: params as any }
    );
  }

  // ===============================
  // UPLOAD API METHODS
  // ===============================

  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.request(
      'POST /api/data/upload',
      'POST',
      '/api/data/upload',
      { body: formData as any } // FormData needs special handling
    );
  }

  async getUploadHistory(params: RequestType<'GET /api/data/upload'> = {}) {
    return this.request(
      'GET /api/data/upload',
      'GET',
      '/api/data/upload',
      { params: params as any }
    );
  }

  // ===============================
  // SNAPSHOT API METHODS
  // ===============================

  async getSnapshots(params: RequestType<'GET /api/data/snapshots'> = {}) {
    return this.request(
      'GET /api/data/snapshots',
      'GET',
      '/api/data/snapshots',
      { params: params as any }
    );
  }

  // ===============================
  // DASHBOARD API METHODS
  // ===============================

  async getDashboardStats(params: RequestType<'GET /api/dashboard/stats'> = {}) {
    return this.request(
      'GET /api/dashboard/stats',
      'GET',
      '/api/dashboard/stats',
      { params: params as any }
    );
  }

  // ===============================
  // LEADERBOARD API METHODS
  // ===============================

  async getLeaderboard(params: RequestType<'GET /api/leaderboard'> = {}) {
    return this.request(
      'GET /api/leaderboard',
      'GET',
      '/api/leaderboard',
      { params: params as any }
    );
  }

  // ===============================
  // ADMIN API METHODS
  // ===============================

  async createUser(body: RequestType<'POST /api/admin/users'>) {
    return this.request(
      'POST /api/admin/users',
      'POST',
      '/api/admin/users',
      { body }
    );
  }

  async updateUser(userId: string, body: RequestType<'PUT /api/admin/users/[userId]'>) {
    return this.request(
      'PUT /api/admin/users/[userId]',
      'PUT',
      `/api/admin/users/${encodeURIComponent(userId)}`,
      { body }
    );
  }

  async getUsers(params: RequestType<'GET /api/admin/users'> = {}) {
    return this.request(
      'GET /api/admin/users',
      'GET',
      '/api/admin/users',
      { params: params as any }
    );
  }

  // ===============================
  // AUTH API METHODS
  // ===============================

  async register(body: RequestType<'POST /api/auth/register'>) {
    return this.request(
      'POST /api/auth/register',
      'POST',
      '/api/auth/register',
      { body }
    );
  }
}

// Default API client instance
export const apiClient = new APIClient();

// Convenience functions for common operations
export const playerAPI = {
  getAll: (filters?: RequestType<'GET /api/data/players'>) => 
    apiClient.getPlayers(filters),
  getById: (id: string) => 
    apiClient.getPlayerById(id),
  search: (query: string, options?: Omit<RequestType<'GET /api/search'>, 'query'>) =>
    apiClient.globalSearch({ query, ...options })
};

export const uploadAPI = {
  upload: (file: File) => 
    apiClient.uploadFile(file),
  getHistory: (filters?: RequestType<'GET /api/data/upload'>) =>
    apiClient.getUploadHistory(filters)
};

export const dashboardAPI = {
  getStats: (options?: RequestType<'GET /api/dashboard/stats'>) =>
    apiClient.getDashboardStats(options),
  getLeaderboard: (filters?: RequestType<'GET /api/leaderboard'>) =>
    apiClient.getLeaderboard(filters)
};

export const adminAPI = {
  createUser: (userData: RequestType<'POST /api/admin/users'>) =>
    apiClient.createUser(userData),
  updateUser: (userId: string, updates: RequestType<'PUT /api/admin/users/[userId]'>) =>
    apiClient.updateUser(userId, updates),
  getUsers: (filters?: RequestType<'GET /api/admin/users'>) =>
    apiClient.getUsers(filters)
};

// Error type is already exported above

// Type guards for error handling
export function isAPIClientError(error: unknown): error is APIClientError {
  return error instanceof APIClientError;
}

export function isNetworkError(error: unknown): boolean {
  return isAPIClientError(error) && error.errorCode === 'NETWORK_ERROR';
}

export function isAuthenticationError(error: unknown): boolean {
  return isAPIClientError(error) && 
    (error.statusCode === 401 || error.errorCode === 'AUTHENTICATION_REQUIRED');
}

export function isAuthorizationError(error: unknown): boolean {
  return isAPIClientError(error) && 
    (error.statusCode === 403 || error.errorCode === 'INSUFFICIENT_PERMISSIONS');
}

export function isValidationError(error: unknown): boolean {
  return isAPIClientError(error) && 
    (error.statusCode === 400 || error.errorCode === 'VALIDATION_ERROR');
}