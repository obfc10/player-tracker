import { BaseService } from './BaseService';
import { getFeaturesConfiguration } from '@/config';

interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  tags?: string[]; // Cache tags for invalidation
}

export class CacheService extends BaseService {
  private cache = new Map<string, CacheItem>();
  private tagIndex = new Map<string, Set<string>>(); // tag -> Set of cache keys
  private readonly defaultTtl: number;
  private readonly enabled: boolean;

  constructor() {
    super();
    const config = getFeaturesConfiguration();
    this.defaultTtl = config.cache.defaultTtlMs;
    this.enabled = config.cache.enabled;
  }

  /**
   * Get cached data by key
   */
  get<T>(key: string): T | null {
    if (!this.enabled) {
      return null;
    }

    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    // Check if cache item has expired
    const now = Date.now();
    if (now > item.timestamp + item.ttl) {
      this.delete(key);
      return null;
    }

    this.logInfo('get', `Cache hit for key: ${key}`);
    return item.data as T;
  }

  /**
   * Set cached data with optional TTL and tags
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    if (!this.enabled) {
      return;
    }

    const ttl = options.ttl || this.defaultTtl;
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };

    this.cache.set(key, item);

    // Index by tags for invalidation
    if (options.tags) {
      for (const tag of options.tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(key);
      }
    }

    this.logInfo('set', `Cache set for key: ${key}, TTL: ${ttl}ms, tags: ${options.tags?.join(', ') || 'none'}`);
  }

  /**
   * Delete cached data by key
   */
  delete(key: string): boolean {
    if (!this.enabled) {
      return false;
    }

    const deleted = this.cache.delete(key);
    
    // Remove from tag index
    for (const [tag, keys] of this.tagIndex.entries()) {
      if (keys.has(key)) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }

    if (deleted) {
      this.logInfo('delete', `Cache deleted for key: ${key}`);
    }

    return deleted;
  }

  /**
   * Invalidate all cache entries with specific tags
   */
  invalidateByTags(tags: string[]): number {
    if (!this.enabled) {
      return 0;
    }

    let invalidatedCount = 0;
    const keysToDelete = new Set<string>();

    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        keys.forEach(key => keysToDelete.add(key));
      }
    }

    for (const key of keysToDelete) {
      if (this.delete(key)) {
        invalidatedCount++;
      }
    }

    this.logInfo('invalidateByTags', `Invalidated ${invalidatedCount} cache entries for tags: ${tags.join(', ')}`);
    return invalidatedCount;
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    if (!this.enabled) {
      return;
    }

    const count = this.cache.size;
    this.cache.clear();
    this.tagIndex.clear();
    
    this.logInfo('clear', `Cleared ${count} cache entries`);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    totalTags: number;
    memoryUsageEstimate: number;
    enabled: boolean;
  } {
    return {
      totalEntries: this.cache.size,
      totalTags: this.tagIndex.size,
      memoryUsageEstimate: this.estimateMemoryUsage(),
      enabled: this.enabled
    };
  }

  /**
   * Clean expired cache entries
   */
  cleanExpired(): number {
    if (!this.enabled) {
      return 0;
    }

    const now = Date.now();
    let cleanedCount = 0;
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now > item.timestamp + item.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      if (this.delete(key)) {
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logInfo('cleanExpired', `Cleaned ${cleanedCount} expired cache entries`);
    }

    return cleanedCount;
  }

  /**
   * Wrap a function with caching
   */
  async cached<T>(
    key: string,
    fn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    this.set(key, result, options);
    return result;
  }

  private estimateMemoryUsage(): number {
    // Rough estimate of memory usage in bytes
    let estimate = 0;
    
    for (const [key, item] of this.cache.entries()) {
      estimate += key.length * 2; // UTF-16 string
      estimate += JSON.stringify(item.data).length * 2; // Rough estimate
      estimate += 24; // Overhead for timestamp, ttl, etc.
    }

    return estimate;
  }

  /**
   * Start automatic cleanup of expired entries
   */
  startCleanupTimer(intervalMs: number = 60000): NodeJS.Timeout {
    const interval = setInterval(() => {
      this.cleanExpired();
    }, intervalMs);

    this.logInfo('startCleanupTimer', `Started cache cleanup timer with ${intervalMs}ms interval`);
    return interval;
  }
}

// Singleton instance for global use
export const cacheService = new CacheService();

// Common cache keys and tags
export const CacheKeys = {
  LEADERBOARD: (snapshotId: string, alliance: string, sortBy: string, page: number, limit: number) =>
    `leaderboard:${snapshotId}:${alliance}:${sortBy}:${page}:${limit}`,
  
  LATEST_SNAPSHOT: 'snapshot:latest',
  
  ALLIANCES: (snapshotId: string) => `alliances:${snapshotId}`,
  
  NAME_CHANGES: (timeRange: string, page: number, limit: number, alliance: string, search: string) =>
    `name-changes:${timeRange}:${page}:${limit}:${alliance}:${search}`,
  
  PLAYER_DETAIL: (lordId: string) => `player:${lordId}`,
  
  SNAPSHOTS_LIST: 'snapshots:list',
  
  CHANGES_COMPARISON: (fromSnapshot: string, toSnapshot: string, metric: string, alliance: string) =>
    `changes:${fromSnapshot}:${toSnapshot}:${metric}:${alliance}`
} as const;

export const CacheTags = {
  SNAPSHOTS: 'snapshots',
  PLAYERS: 'players',
  LEADERBOARD: 'leaderboard',
  NAME_CHANGES: 'name-changes',
  ALLIANCE_CHANGES: 'alliance-changes',
  CHANGES: 'changes'
} as const;