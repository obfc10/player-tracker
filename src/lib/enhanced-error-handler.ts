import { NextRequest, NextResponse } from 'next/server';
import { ValidationError, DatabaseError } from '@/types/api';
import { ApiErrorDto, ApiResponse } from '@/types/dto';
import { logError, logWarn, logApiRequest, logApiResponse } from './logger';
import { Prisma } from '@prisma/client';

/**
 * Enhanced error types for better categorization
 */
export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ServiceUnavailableError extends Error {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Error classification and HTTP status mapping
 */
function getErrorDetails(error: Error): {
  statusCode: number;
  errorCode: string;
  userMessage: string;
  shouldLog: boolean;
  logLevel: 'error' | 'warn' | 'info';
} {
  // Authentication/Authorization errors
  if (error instanceof AuthenticationError) {
    return {
      statusCode: 401,
      errorCode: 'AUTHENTICATION_REQUIRED',
      userMessage: 'Please log in to access this resource',
      shouldLog: true,
      logLevel: 'warn'
    };
  }

  if (error instanceof AuthorizationError) {
    return {
      statusCode: 403,
      errorCode: 'INSUFFICIENT_PERMISSIONS',
      userMessage: 'You do not have permission to perform this action',
      shouldLog: true,
      logLevel: 'warn'
    };
  }

  // Validation errors
  if (error instanceof ValidationError) {
    return {
      statusCode: 400,
      errorCode: 'VALIDATION_ERROR',
      userMessage: error.message,
      shouldLog: true,
      logLevel: 'warn'
    };
  }

  // Not found errors
  if (error instanceof NotFoundError) {
    return {
      statusCode: 404,
      errorCode: 'RESOURCE_NOT_FOUND',
      userMessage: error.message,
      shouldLog: true,
      logLevel: 'info'
    };
  }

  // Rate limiting
  if (error instanceof RateLimitError) {
    return {
      statusCode: 429,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      userMessage: 'Too many requests. Please try again later',
      shouldLog: true,
      logLevel: 'warn'
    };
  }

  // Service availability
  if (error instanceof ServiceUnavailableError) {
    return {
      statusCode: 503,
      errorCode: 'SERVICE_UNAVAILABLE',
      userMessage: 'Service is temporarily unavailable. Please try again later',
      shouldLog: true,
      logLevel: 'error'
    };
  }

  // Database errors
  if (error instanceof DatabaseError) {
    return {
      statusCode: 500,
      errorCode: 'DATABASE_ERROR',
      userMessage: 'A database error occurred. Please try again',
      shouldLog: true,
      logLevel: 'error'
    };
  }

  // Prisma-specific errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return {
          statusCode: 409,
          errorCode: 'UNIQUE_CONSTRAINT_VIOLATION',
          userMessage: 'A record with this information already exists',
          shouldLog: true,
          logLevel: 'warn'
        };
      case 'P2025':
        return {
          statusCode: 404,
          errorCode: 'RECORD_NOT_FOUND',
          userMessage: 'The requested record was not found',
          shouldLog: true,
          logLevel: 'info'
        };
      case 'P2003':
        return {
          statusCode: 400,
          errorCode: 'FOREIGN_KEY_CONSTRAINT',
          userMessage: 'Cannot perform this operation due to related records',
          shouldLog: true,
          logLevel: 'warn'
        };
      default:
        return {
          statusCode: 500,
          errorCode: 'DATABASE_ERROR',
          userMessage: 'A database error occurred',
          shouldLog: true,
          logLevel: 'error'
        };
    }
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return {
      statusCode: 500,
      errorCode: 'DATABASE_CONNECTION_ERROR',
      userMessage: 'Database connection failed. Please try again',
      shouldLog: true,
      logLevel: 'error'
    };
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      statusCode: 400,
      errorCode: 'DATABASE_VALIDATION_ERROR',
      userMessage: 'Invalid data provided',
      shouldLog: true,
      logLevel: 'warn'
    };
  }

  // Generic/unknown errors
  return {
    statusCode: 500,
    errorCode: 'INTERNAL_SERVER_ERROR',
    userMessage: 'An unexpected error occurred. Please try again',
    shouldLog: true,
    logLevel: 'error'
  };
}

/**
 * Enhanced API error boundary with comprehensive error handling
 */
export function enhancedApiErrorBoundary<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse<ApiResponse<R>>>,
  context: string,
  options: {
    requireAuth?: boolean;
    rateLimitKey?: (req: NextRequest) => string;
    logRequests?: boolean;
  } = {}
) {
  return async (...args: T): Promise<NextResponse<ApiResponse<R>>> => {
    const startTime = Date.now();
    const request = args[0] as NextRequest;
    let method = 'UNKNOWN';
    let path = 'unknown';

    try {
      method = request.method;
      path = new URL(request.url).pathname;

      // Log request if enabled
      if (options.logRequests !== false) {
        logApiRequest(method, path, undefined);
      }

      // Execute the handler
      const response = await handler(...args);
      
      // Log successful response
      const duration = Date.now() - startTime;
      logApiResponse(method, path, response.status, duration);
      
      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));
      
      // Get error classification
      const errorDetails = getErrorDetails(err);
      
      // Log error if needed
      if (errorDetails.shouldLog) {
        const logFunction = errorDetails.logLevel === 'error' ? logError 
          : errorDetails.logLevel === 'warn' ? logWarn 
          : console.log;

        if (errorDetails.logLevel === 'error') {
          logError(context, `${method} ${path} failed`, err, {
            statusCode: errorDetails.statusCode,
            errorCode: errorDetails.errorCode,
            duration
          });
        } else {
          logWarn(context, `${method} ${path} - ${errorDetails.userMessage}`, {
            error: err.message,
            statusCode: errorDetails.statusCode,
            errorCode: errorDetails.errorCode,
            duration
          });
        }
      }

      // Create standardized error response
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: errorDetails.userMessage,
        metadata: {
          timestamp: new Date().toISOString(),
          errorCode: errorDetails.errorCode,
          path,
          method,
          duration,
          ...(process.env.NODE_ENV === 'development' ? {
            stack: err.stack,
            originalMessage: err.message
          } : {})
        }
      };

      return NextResponse.json(errorResponse, { 
        status: errorDetails.statusCode,
        headers: {
          'Content-Type': 'application/json',
          ...(errorDetails.statusCode === 429 ? {
            'Retry-After': '60'
          } : {})
        }
      });
    }
  };
}

/**
 * Middleware for consistent error handling across routes
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse<ApiResponse<R>>>,
  context: string
) {
  return enhancedApiErrorBoundary(handler, context, { logRequests: true });
}

/**
 * Helper to create standardized success responses
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  metadata?: Record<string, any>
): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(message ? { message } : {}),
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };
}

/**
 * Helper to create standardized error responses
 */
export function createErrorResponse(
  error: string,
  errorCode?: string,
  metadata?: Record<string, any>
): ApiResponse<never> {
  return {
    success: false,
    error,
    metadata: {
      timestamp: new Date().toISOString(),
      ...(errorCode ? { errorCode } : {}),
      ...metadata
    }
  };
}

/**
 * Async error wrapper for services and utilities
 */
export async function withAsyncErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  errorTransform?: (error: Error) => Error
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const transformedError = errorTransform ? errorTransform(err) : err;
    
    logError(context, 'Operation failed', transformedError);
    throw transformedError;
  }
}

/**
 * Rate limiting helper (simple in-memory implementation)
 */
class SimpleRateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(key: string): boolean {
    const now = Date.now();
    const record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      this.requests.set(key, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (record.count >= this.maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  // Clean up expired entries periodically
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

export const defaultRateLimiter = new SimpleRateLimiter();

// Clean up rate limiter every 5 minutes
setInterval(() => defaultRateLimiter.cleanup(), 5 * 60 * 1000);