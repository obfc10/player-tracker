'use client';

import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';
import { errorTracker } from '@/lib/error-tracker';
import { logInfo } from '@/lib/logger';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize error tracking
    errorTracker.logInfo('Providers', 'Application initialized');
    
    logInfo('Providers', 'NextAuth SessionProvider mounted', {
      windowLocation: window.location.href
    });
    
    // Check if nextauth session exists
    const cookies = document.cookie.split(';').map(c => c.trim());
    const nextAuthSession = cookies.find(c => c.startsWith('next-auth.session-token'));
    
    // Log session info to both error tracker and logger
    const sessionInfo = {
      hasNextAuthSession: !!nextAuthSession,
      url: window.location.href,
    };
    
    errorTracker.logInfo('Providers.nextauth', 'NextAuth session check', sessionInfo);
    logInfo('Providers', 'NextAuth session check completed', sessionInfo);
  }, []);
  
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}