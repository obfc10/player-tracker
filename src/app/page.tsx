'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { SystemStatus } from '@/components/debug/SystemStatus';
import { ErrorDisplay } from '@/components/debug/ErrorDisplay';
import { DevOnly } from '@/components/debug/DebugWrapper';
import { logInfo, logError, logWarn } from '@/lib/logger';

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    logInfo('HomePage', 'Session status check', {
      status,
      sessionExists: !!session,
      currentTime: new Date().toISOString()
    });
    
    // Add a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (status === 'loading') {
        logError('HomePage', 'Session loading timeout after 10 seconds');
        logWarn('HomePage', 'Forcing redirect to signin due to timeout');
        router.push('/auth/signin');
      }
    }, 10000); // 10 second timeout

    if (status === 'loading') {
      logInfo('HomePage', 'Session still loading, waiting...');
      return; // Still loading
    }

    clearTimeout(timeout);

    if (session) {
      logInfo('HomePage', 'User authenticated, redirecting to dashboard', {
        userId: session.user?.id,
        username: session.user?.username
      });
      // User is authenticated, redirect to dashboard
      router.push('/dashboard');
    } else {
      logInfo('HomePage', 'User not authenticated, redirecting to signin');
      // User is not authenticated, redirect to login
      router.push('/auth/signin');
    }

    return () => clearTimeout(timeout);
  }, [session, status, router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p className="text-white">Loading Player Tracker...</p>
        <p className="text-gray-400 text-sm mt-2">Status: {status}</p>
        <DevOnly>
          <p className="text-gray-500 text-xs mt-1">
            Session: {session ? 'Authenticated' : 'Not authenticated'}
          </p>
          <SystemStatus />
          <ErrorDisplay />
        </DevOnly>
      </div>
    </div>
  );
}