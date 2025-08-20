'use client';

import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';
import { errorTracker } from '@/lib/error-tracker';
import { logInfo } from '@/lib/logger';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize error tracking
    errorTracker.logInfo('Providers', 'Application initialized');
    
    logInfo('Providers', 'SessionProvider mounted', {
      windowLocation: window.location.href,
      nextAuthUrl: process.env.NEXTAUTH_URL
    });
    
    // Check if session storage has any auth data
    const sessionData = typeof window !== 'undefined' ? window.sessionStorage.getItem('next-auth.session-token') : null;
    
    // Check cookies for session
    const cookies = document.cookie.split(';').map(c => c.trim());
    const sessionCookie = cookies.find(c => c.startsWith('next-auth.session-token'));
    
    // Log session info to both error tracker and logger
    const sessionInfo = {
      hasSessionStorage: !!sessionData,
      hasSessionCookie: !!sessionCookie,
      url: window.location.href,
    };
    
    errorTracker.logInfo('Providers.session', 'Session check', sessionInfo);
    logInfo('Providers', 'Session check completed', sessionInfo);
  }, []);
  
  return (
    <SessionProvider
      refetchInterval={0}
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  );
}