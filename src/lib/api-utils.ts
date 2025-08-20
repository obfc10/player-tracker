import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ServiceError } from '@/types/api';
import {
  createErrorResponse as createErrorResponseHandler,
  createSuccessResponse as createSuccessResponseHandler
} from '@/lib/error-handler';
import { logAuthEvent, logError } from '@/lib/logger';

/**
 * @deprecated Use createErrorResponse from error-handler instead
 */
export async function handleApiError(error: any): Promise<NextResponse> {
  logError('API', 'Legacy handleApiError called - use createErrorResponse instead', error as Error);
  return createErrorResponseHandler(error);
}

/**
 * @deprecated Use createSuccessResponse from error-handler instead
 */
export async function createSuccessResponse<T>(data: T, message?: string): Promise<NextResponse> {
  return createSuccessResponseHandler(data, message);
}

export async function requireAdminAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    logAuthEvent('admin_auth_failed', undefined, { reason: 'no_session' });
    throw new ServiceError('Authentication required', 'UNAUTHENTICATED', 401);
  }
  
  if (session.user.role !== 'ADMIN') {
    logAuthEvent('admin_auth_failed', session.user.id, {
      reason: 'insufficient_role',
      userRole: session.user.role
    });
    throw new ServiceError('Admin access required', 'UNAUTHORIZED', 403);
  }
  
  logAuthEvent('admin_auth_success', session.user.id);
  return session;
}

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    logAuthEvent('auth_failed', undefined, { reason: 'no_session' });
    throw new ServiceError('Authentication required', 'UNAUTHENTICATED', 401);
  }
  
  logAuthEvent('auth_success', session.user.id);
  return session;
}

/**
 * Requires specific role or higher
 */
export async function requireRole(requiredRole: 'ADMIN' | 'EVENT_MANAGER' | 'VIEWER') {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    logAuthEvent('role_auth_failed', undefined, { reason: 'no_session', requiredRole });
    throw new ServiceError('Authentication required', 'UNAUTHENTICATED', 401);
  }

  const roleHierarchy = { 'VIEWER': 0, 'EVENT_MANAGER': 1, 'ADMIN': 2 };
  const userRoleLevel = roleHierarchy[session.user.role as keyof typeof roleHierarchy] ?? -1;
  const requiredRoleLevel = roleHierarchy[requiredRole];

  if (userRoleLevel < requiredRoleLevel) {
    logAuthEvent('role_auth_failed', session.user.id, {
      reason: 'insufficient_role',
      userRole: session.user.role,
      requiredRole
    });
    throw new ServiceError(`${requiredRole} access required`, 'UNAUTHORIZED', 403);
  }

  logAuthEvent('role_auth_success', session.user.id, { userRole: session.user.role, requiredRole });
  return session;
}