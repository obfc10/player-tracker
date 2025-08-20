/**
 * Debug component wrapper that conditionally renders debug components
 * Only shows debug components in development environment
 */

'use client';

import { ReactNode } from 'react';

interface DebugWrapperProps {
  children: ReactNode;
  forceShow?: boolean;
}

export function DebugWrapper({ children, forceShow = false }: DebugWrapperProps) {
  // Only show debug components in development or when explicitly forced
  const shouldShow = process.env.NODE_ENV === 'development' || forceShow;
  
  if (!shouldShow) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Higher-order component to wrap debug components
 */
export function withDebugWrapper<P extends object>(
  Component: React.ComponentType<P>,
  forceShow?: boolean
) {
  return function DebugComponent(props: P) {
    return (
      <DebugWrapper forceShow={forceShow}>
        <Component {...props} />
      </DebugWrapper>
    );
  };
}

/**
 * Hook to check if debug mode is enabled
 */
export function useDebugMode(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Conditional debug logging that only logs in development
 */
export function debugLog(message: string, data?: any): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEBUG] ${message}`, data || '');
  }
}

/**
 * Debug-only component that renders children only in development
 */
export function DevOnly({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  return <>{children}</>;
}

/**
 * Production-only component that renders children only in production
 */
export function ProdOnly({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === 'development') {
    return null;
  }
  return <>{children}</>;
}