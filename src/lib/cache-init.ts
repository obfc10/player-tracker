/**
 * Cache initialization and lifecycle management
 */

import { cacheService } from '@/services/CacheService';
import { getFeaturesConfiguration } from '@/config';
import { logInfo, logWarn } from '@/lib/logger';

let cleanupTimer: NodeJS.Timeout | null = null;

/**
 * Initialize caching system
 */
export function initializeCache(): void {
  try {
    const config = getFeaturesConfiguration();
    
    if (!config.cache.enabled) {
      logInfo('Cache', 'Caching disabled by configuration');
      return;
    }

    // Start cleanup timer
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
    }
    
    cleanupTimer = cacheService.startCleanupTimer(config.cache.cleanupIntervalMs);
    
    logInfo('Cache', 'Cache system initialized', {
      enabled: config.cache.enabled,
      defaultTtlMs: config.cache.defaultTtlMs,
      cleanupIntervalMs: config.cache.cleanupIntervalMs,
      maxSize: config.cache.maxSize
    });
    
  } catch (error) {
    logWarn('Cache', 'Failed to initialize cache system', error);
  }
}

/**
 * Shutdown caching system
 */
export function shutdownCache(): void {
  try {
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
    
    cacheService.clear();
    logInfo('Cache', 'Cache system shutdown completed');
    
  } catch (error) {
    logWarn('Cache', 'Error during cache shutdown', error);
  }
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
  return cacheService.getStats();
}

// Initialize cache on module load in production
if (process.env.NODE_ENV === 'production') {
  initializeCache();
}

// Handle graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGTERM', shutdownCache);
  process.on('SIGINT', shutdownCache);
}