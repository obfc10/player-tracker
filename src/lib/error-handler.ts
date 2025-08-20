/**
 * Centralized error handling utilities
 * Provides consistent error handling patterns across the application
 */

import { NextResponse } from 'next/server';
import { logError, logWarn } from './logger';
import { ServiceError, ValidationError, NotFoundError, DatabaseError } from '@/types/api';

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
  requestId?: string;
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: Error | ServiceError,
  requestId?: string
): NextResponse<ErrorResponse> {
  const timestamp = new Date().toISOString();
  
  if (error instanceof ServiceError) {
    logError('ErrorHandler', `Service error: ${error.message}`, error, {
      code: error.code,
      statusCode: error.statusCode,
      requestId
    });

    const response: ErrorResponse = {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
      timestamp,
      requestId
    };

    return NextResponse.json(response, { status: error.statusCode });
  }

  // Handle unknown errors
  logError('ErrorHandler', `Unexpected error: ${error.message}`, error, { requestId });

  const response: ErrorResponse = {
    success: false,
    error: 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    timestamp,
    requestId
  };

  return NextResponse.json(response, { status: 500 });
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  requestId?: string
): NextResponse<SuccessResponse<T>> {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId
  };

  return NextResponse.json(response);
}

/**
 * Wraps an async function with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: string
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(context, `Error in ${fn.name || 'anonymous function'}`, error as Error);
      throw error;
    }
  };
}

/**
 * Validates required environment variables
 */
export function validateEnvironment(requiredVars: string[]): void {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    const error = new Error(`Missing required environment variables: ${missing.join(', ')}`);
    logError('Environment', 'Environment validation failed', error, { missing });
    throw error;
  }
}

/**
 * Handles Prisma-specific errors
 */
export function handlePrismaError(error: any, context: string): ServiceError {
  logError(context, 'Prisma error occurred', error);

  switch (error.code) {
    case 'P2002':
      return new ValidationError(
        'A record with this data already exists',
        { field: error.meta?.target }
      );
    case 'P2025':
      return new NotFoundError('Record', error.meta?.cause);
    case 'P2003':
      return new ValidationError(
        'Foreign key constraint failed',
        { field: error.meta?.field_name }
      );
    case 'P2016':
      return new ValidationError(
        'Query interpretation error',
        { details: error.meta }
      );
    default:
      return new DatabaseError(
        `Database operation failed: ${error.message}`,
        { code: error.code, meta: error.meta }
      );
  }
}

/**
 * Type guard for ServiceError
 */
export function isServiceError(error: any): error is ServiceError {
  return error instanceof ServiceError;
}

/**
 * Async error boundary for API routes
 */
export function apiErrorBoundary<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse<R>>,
  context: string
) {
  return async (...args: T): Promise<NextResponse<R | ErrorResponse>> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (isServiceError(error)) {
        return createErrorResponse(error);
      }
      
      // Handle Prisma errors
      if (error && typeof error === 'object' && 'code' in error) {
        const serviceError = handlePrismaError(error, context);
        return createErrorResponse(serviceError);
      }

      // Handle unknown errors
      return createErrorResponse(error as Error);
    }
  };
}

/**
 * Middleware for request logging
 */
export function logRequest(method: string, path: string, userId?: string): void {
  logWarn('API', `${method} ${path}`, { userId, timestamp: new Date().toISOString() });
}

/**
 * Middleware for response logging
 */
export function logResponse(
  method: string, 
  path: string, 
  status: number, 
  duration?: number
): void {
  logWarn('API', `${method} ${path} -> ${status}`, { duration, timestamp: new Date().toISOString() });
}