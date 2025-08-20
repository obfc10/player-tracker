import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logInfo, logError } from '@/lib/logger';
import { apiErrorBoundary } from '@/lib/error-handler';

async function systemCheckHandler() {
  logInfo('SystemCheck', 'Endpoint called');
  
  const checks = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
      NEXTAUTH_SECRET_EXISTS: !!process.env.NEXTAUTH_SECRET,
    },
    database: {
      connected: false,
      error: null as string | null,
    },
    auth: {
      sessionExists: false,
      sessionData: null as any,
      error: null as string | null,
    },
    prisma: {
      clientCreated: false,
      error: null as string | null,
    }
  };

  // Check database connection
  try {
    logInfo('SystemCheck', 'Testing database connection');
    const { prisma } = await import('@/lib/db');
    await prisma.$queryRaw`SELECT 1`;
    checks.database.connected = true;
    checks.prisma.clientCreated = true;
    logInfo('SystemCheck', 'Database connection successful');
  } catch (error) {
    logError('SystemCheck', 'Database connection failed', error as Error);
    checks.database.error = error instanceof Error ? error.message : 'Unknown error';
    checks.prisma.error = error instanceof Error ? error.message : 'Unknown error';
  }

  // Check auth session
  try {
    logInfo('SystemCheck', 'Checking auth session');
    const session = await getServerSession(authOptions);
    checks.auth.sessionExists = !!session;
    checks.auth.sessionData = session ? {
      user: {
        id: session.user?.id,
        username: session.user?.username,
        role: session.user?.role,
      }
    } : null;
    logInfo('SystemCheck', 'Auth session check complete', { sessionExists: !!session });
  } catch (error) {
    logError('SystemCheck', 'Auth session check failed', error as Error);
    checks.auth.error = error instanceof Error ? error.message : 'Unknown error';
  }

  logInfo('SystemCheck', 'System check completed', {
    databaseConnected: checks.database.connected,
    sessionExists: checks.auth.sessionExists,
    hasErrors: !!(checks.database.error || checks.auth.error || checks.prisma.error)
  });

  return NextResponse.json(checks);
}

export const GET = apiErrorBoundary(systemCheckHandler, 'SystemCheck');