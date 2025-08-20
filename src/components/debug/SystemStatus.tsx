'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { logInfo, logError } from '@/lib/logger';

interface SystemCheck {
  timestamp: string;
  environment: {
    NODE_ENV: string;
    NEXTAUTH_URL: string;
    DATABASE_URL_EXISTS: boolean;
    NEXTAUTH_SECRET_EXISTS: boolean;
  };
  database: {
    connected: boolean;
    error: string | null;
  };
  auth: {
    sessionExists: boolean;
    sessionData: any;
    error: string | null;
  };
  prisma: {
    clientCreated: boolean;
    error: string | null;
  };
}

export function SystemStatus() {
  const { data: session, status } = useSession();
  const [systemCheck, setSystemCheck] = useState<SystemCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    logInfo('SystemStatus', 'Component mounted', {
      sessionStatus: status,
      sessionExists: !!session
    });

    const checkSystem = async () => {
      try {
        logInfo('SystemStatus', 'Fetching system check');
        const response = await fetch('/api/debug/system-check');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        logInfo('SystemStatus', 'System check completed', {
          databaseConnected: data.database?.connected,
          authSessionExists: data.auth?.sessionExists
        });
        setSystemCheck(data);
      } catch (err) {
        logError('SystemStatus', 'Failed to fetch system check', err as Error);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    checkSystem();
  }, [session, status]);

  if (loading) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-md">
        <div className="animate-pulse">Loading system status...</div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-md text-xs font-mono">
      <h3 className="text-sm font-bold mb-2">System Debug Info</h3>
      
      <div className="space-y-2">
        <div>
          <strong>Client Session:</strong>
          <div className="ml-2">
            Status: <span className={status === 'authenticated' ? 'text-green-400' : 'text-red-400'}>{status}</span>
            {session && (
              <div>User: {session.user?.username} ({session.user?.role})</div>
            )}
          </div>
        </div>

        {error && (
          <div className="text-red-400">
            <strong>Error:</strong> {error}
          </div>
        )}

        {systemCheck && (
          <>
            <div>
              <strong>Environment:</strong>
              <div className="ml-2">
                NODE_ENV: {systemCheck.environment.NODE_ENV}<br />
                NEXTAUTH_URL: {systemCheck.environment.NEXTAUTH_URL}<br />
                DB_URL: {systemCheck.environment.DATABASE_URL_EXISTS ? '✓' : '✗'}<br />
                AUTH_SECRET: {systemCheck.environment.NEXTAUTH_SECRET_EXISTS ? '✓' : '✗'}
              </div>
            </div>

            <div>
              <strong>Database:</strong>
              <div className="ml-2">
                Connected: <span className={systemCheck.database.connected ? 'text-green-400' : 'text-red-400'}>
                  {systemCheck.database.connected ? '✓' : '✗'}
                </span>
                {systemCheck.database.error && (
                  <div className="text-red-400 text-xs">{systemCheck.database.error}</div>
                )}
              </div>
            </div>

            <div>
              <strong>Server Auth:</strong>
              <div className="ml-2">
                Session: <span className={systemCheck.auth.sessionExists ? 'text-green-400' : 'text-red-400'}>
                  {systemCheck.auth.sessionExists ? '✓' : '✗'}
                </span>
                {systemCheck.auth.error && (
                  <div className="text-red-400 text-xs">{systemCheck.auth.error}</div>
                )}
              </div>
            </div>

            <div className="text-gray-400 text-xs mt-2">
              Last check: {new Date(systemCheck.timestamp).toLocaleTimeString()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}