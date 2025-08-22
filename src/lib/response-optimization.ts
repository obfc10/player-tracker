import { NextResponse } from 'next/server';
import { getFeaturesConfiguration } from '@/config';

export interface OptimizedResponseOptions {
  enableCompression?: boolean;
  enableCaching?: boolean;
  cacheMaxAge?: number;
  enableETag?: boolean;
  enableStreaming?: boolean;
}

/**
 * Create an optimized JSON response with compression and caching headers
 */
export function createOptimizedResponse(
  data: any,
  options: OptimizedResponseOptions = {}
): NextResponse {
  const config = getFeaturesConfiguration();
  const {
    enableCompression = config.cache.enableCompression,
    enableCaching = config.api.enableCaching,
    cacheMaxAge = config.api.cacheTimeout,
    enableETag = true,
    enableStreaming = false
  } = options;

  // Create the response
  const response = NextResponse.json(data);

  // Add performance headers
  response.headers.set('X-Response-Time', Date.now().toString());
  response.headers.set('X-Powered-By', 'Player Tracker API');

  // Add caching headers if enabled
  if (enableCaching) {
    response.headers.set('Cache-Control', `public, max-age=${cacheMaxAge}, stale-while-revalidate=86400`);
    response.headers.set('Vary', 'Accept-Encoding, Authorization');
  } else {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }

  // Add ETag for conditional requests if enabled
  if (enableETag) {
    const etag = generateETag(data);
    response.headers.set('ETag', etag);
  }

  // Add compression hints if enabled
  if (enableCompression) {
    response.headers.set('Content-Encoding', 'gzip');
  }

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}

/**
 * Generate ETag for response caching
 */
function generateETag(data: any): string {
  // Simple hash-based ETag generation
  const content = JSON.stringify(data);
  let hash = 0;
  
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `"${Math.abs(hash).toString(16)}"`;
}

/**
 * Check if client supports conditional requests
 */
export function checkConditionalRequest(
  request: Request,
  etag: string
): boolean {
  const ifNoneMatch = request.headers.get('If-None-Match');
  return ifNoneMatch === etag;
}

/**
 * Create a 304 Not Modified response
 */
export function createNotModifiedResponse(): NextResponse {
  const response = new NextResponse(null, { status: 304 });
  response.headers.set('Cache-Control', 'public, max-age=3600');
  return response;
}

/**
 * Add CORS headers for API responses
 */
export function addCORSHeaders(response: NextResponse): NextResponse {
  const config = getFeaturesConfiguration();
  
  if (config.security.enableCors) {
    const origins = config.security.corsOrigins;
    response.headers.set('Access-Control-Allow-Origin', origins.join(', '));
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400');
  }
  
  return response;
}

/**
 * Optimize response for large datasets
 */
export function optimizeForLargeDataset(
  data: any[],
  page: number,
  limit: number,
  total: number
): {
  data: any[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  performance: {
    itemCount: number;
    responseSize: number;
    optimized: boolean;
  };
} {
  const totalPages = Math.ceil(total / limit);
  const responseSize = JSON.stringify(data).length;
  
  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    },
    performance: {
      itemCount: data.length,
      responseSize,
      optimized: true
    }
  };
}

/**
 * Response timing utilities
 */
export class ResponseTimer {
  private startTime: number;
  
  constructor() {
    this.startTime = Date.now();
  }
  
  elapsed(): number {
    return Date.now() - this.startTime;
  }
  
  addTimingHeader(response: NextResponse): NextResponse {
    response.headers.set('X-Response-Time', `${this.elapsed()}ms`);
    return response;
  }
}

/**
 * Batch response utility for multiple queries
 */
export async function createBatchResponse<T>(
  operations: Array<() => Promise<T>>,
  options: OptimizedResponseOptions = {}
): Promise<NextResponse> {
  const timer = new ResponseTimer();
  
  try {
    const results = await Promise.all(operations.map(async (op, index) => {
      try {
        const result = await op();
        return { index, success: true, data: result };
      } catch (error) {
        return { 
          index, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }));
    
    const response = createOptimizedResponse({
      results,
      performance: {
        totalOperations: operations.length,
        successfulOperations: results.filter(r => r.success).length,
        failedOperations: results.filter(r => !r.success).length,
        responseTime: timer.elapsed()
      }
    }, options);
    
    return timer.addTimingHeader(response);
    
  } catch (error) {
    const response = createOptimizedResponse({
      error: 'Batch operation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      performance: {
        responseTime: timer.elapsed()
      }
    }, { ...options, enableCaching: false });
    
    return timer.addTimingHeader(response);
  }
}