/**
 * Feature flags and application-specific configuration
 */

import { ConfigSection, ConfigValidator, EnvUtils, loadConfigSection } from './base';

export interface FeaturesConfig {
  // Player tracking features
  readonly playerTracking: {
    powerFloor: number;
    leftRealmCutoffDays: number;
    maxSnapshotsPerPlayer: number;
    maxHistoryEntries: number;
    enableNameChangeTracking: boolean;
    enableAllianceChangeTracking: boolean;
    enableRealmStatusTracking: boolean;
    enableBattleEfficiencyCalculation: boolean;
  };
  
  // File processing features
  readonly fileProcessing: {
    maxFileSize: number; // in bytes
    allowedExtensions: string[];
    processingTimeout: number; // in milliseconds
    enableBatchProcessing: boolean;
    batchSize: number;
    enableFileValidation: boolean;
    enableVirusScan: boolean;
    enableFileCompression: boolean;
  };
  
  // API features
  readonly api: {
    defaultPageSize: number;
    maxPageSize: number;
    requestTimeout: number;
    enableRateLimiting: boolean;
    rateLimit: {
      windowMs: number;
      maxRequests: number;
    };
    enableCaching: boolean;
    cacheTimeout: number;
    enableApiVersioning: boolean;
  };
  
  // Caching configuration
  readonly cache: {
    enabled: boolean;
    defaultTtlMs: number;
    maxSize: number;
    cleanupIntervalMs: number;
    enableTagging: boolean;
    enableCompression: boolean;
    enableStatistics: boolean;
  };
  
  // UI features
  readonly ui: {
    refreshInterval: number;
    errorDisplayDuration: number;
    loadingTimeout: number;
    enableDarkMode: boolean;
    enableExportFeatures: boolean;
    enableAdvancedFiltering: boolean;
    enableRealTimeUpdates: boolean;
    maxSearchResults: number;
    enableTooltips: boolean;
    enableKeyboardShortcuts: boolean;
  };
  
  // Analytics and monitoring
  readonly analytics: {
    enableUserTracking: boolean;
    enablePerformanceMonitoring: boolean;
    enableErrorTracking: boolean;
    enableUsageStatistics: boolean;
    retentionDays: number;
    enableHeatmaps: boolean;
  };
  
  // Security features
  readonly security: {
    enableCsrfProtection: boolean;
    enableCors: boolean;
    corsOrigins: string[];
    enableRequestSigning: boolean;
    enableIpWhitelist: boolean;
    ipWhitelist: string[];
    enableBruteForceProtection: boolean;
    enableSqlInjectionProtection: boolean;
  };
  
  // Experimental features
  readonly experimental: {
    enableBetaFeatures: boolean;
    enableAlphaFeatures: boolean;
    features: string[];
  };
}

const featuresConfigSection: ConfigSection<FeaturesConfig> = {
  schema: {
    playerTracking: {
      powerFloor: ConfigValidator.validateInteger(0, 1000000000),
      leftRealmCutoffDays: ConfigValidator.validateInteger(1, 365),
      maxSnapshotsPerPlayer: ConfigValidator.validateInteger(10, 1000),
      maxHistoryEntries: ConfigValidator.validateInteger(10, 500),
      enableNameChangeTracking: ConfigValidator.validateBoolean(),
      enableAllianceChangeTracking: ConfigValidator.validateBoolean(),
      enableRealmStatusTracking: ConfigValidator.validateBoolean(),
      enableBattleEfficiencyCalculation: ConfigValidator.validateBoolean()
    } as any,
    
    fileProcessing: {
      maxFileSize: ConfigValidator.validateInteger(1024 * 1024, 1024 * 1024 * 1024), // 1MB to 1GB
      allowedExtensions: ConfigValidator.validateArray(ConfigValidator.validateString()),
      processingTimeout: ConfigValidator.validateInteger(5000, 600000), // 5 seconds to 10 minutes
      enableBatchProcessing: ConfigValidator.validateBoolean(),
      batchSize: ConfigValidator.validateInteger(1, 1000),
      enableFileValidation: ConfigValidator.validateBoolean(),
      enableVirusScan: ConfigValidator.validateBoolean(),
      enableFileCompression: ConfigValidator.validateBoolean()
    } as any,
    
    api: {
      defaultPageSize: ConfigValidator.validateInteger(5, 100),
      maxPageSize: ConfigValidator.validateInteger(10, 1000),
      requestTimeout: ConfigValidator.validateInteger(1000, 60000),
      enableRateLimiting: ConfigValidator.validateBoolean(),
      rateLimit: {
        windowMs: ConfigValidator.validateInteger(1000, 3600000), // 1 second to 1 hour
        maxRequests: ConfigValidator.validateInteger(1, 10000)
      } as any,
      enableCaching: ConfigValidator.validateBoolean(),
      cacheTimeout: ConfigValidator.validateInteger(60, 86400), // 1 minute to 1 day
      enableApiVersioning: ConfigValidator.validateBoolean()
    } as any,
    
    cache: {
      enabled: ConfigValidator.validateBoolean(),
      defaultTtlMs: ConfigValidator.validateInteger(60000, 3600000), // 1 minute to 1 hour
      maxSize: ConfigValidator.validateInteger(100, 10000),
      cleanupIntervalMs: ConfigValidator.validateInteger(30000, 300000), // 30 seconds to 5 minutes
      enableTagging: ConfigValidator.validateBoolean(),
      enableCompression: ConfigValidator.validateBoolean(),
      enableStatistics: ConfigValidator.validateBoolean()
    } as any,
    
    ui: {
      refreshInterval: ConfigValidator.validateInteger(1000, 300000), // 1 second to 5 minutes
      errorDisplayDuration: ConfigValidator.validateInteger(1000, 30000), // 1 to 30 seconds
      loadingTimeout: ConfigValidator.validateInteger(5000, 60000), // 5 to 60 seconds
      enableDarkMode: ConfigValidator.validateBoolean(),
      enableExportFeatures: ConfigValidator.validateBoolean(),
      enableAdvancedFiltering: ConfigValidator.validateBoolean(),
      enableRealTimeUpdates: ConfigValidator.validateBoolean(),
      maxSearchResults: ConfigValidator.validateInteger(10, 1000),
      enableTooltips: ConfigValidator.validateBoolean(),
      enableKeyboardShortcuts: ConfigValidator.validateBoolean()
    } as any,
    
    analytics: {
      enableUserTracking: ConfigValidator.validateBoolean(),
      enablePerformanceMonitoring: ConfigValidator.validateBoolean(),
      enableErrorTracking: ConfigValidator.validateBoolean(),
      enableUsageStatistics: ConfigValidator.validateBoolean(),
      retentionDays: ConfigValidator.validateInteger(7, 365),
      enableHeatmaps: ConfigValidator.validateBoolean()
    } as any,
    
    security: {
      enableCsrfProtection: ConfigValidator.validateBoolean(),
      enableCors: ConfigValidator.validateBoolean(),
      corsOrigins: ConfigValidator.validateArray(ConfigValidator.validateString()),
      enableRequestSigning: ConfigValidator.validateBoolean(),
      enableIpWhitelist: ConfigValidator.validateBoolean(),
      ipWhitelist: ConfigValidator.validateArray(ConfigValidator.validateString()),
      enableBruteForceProtection: ConfigValidator.validateBoolean(),
      enableSqlInjectionProtection: ConfigValidator.validateBoolean()
    } as any,
    
    experimental: {
      enableBetaFeatures: ConfigValidator.validateBoolean(),
      enableAlphaFeatures: ConfigValidator.validateBoolean(),
      features: ConfigValidator.validateArray(ConfigValidator.validateString())
    } as any
  },
  
  defaults: {
    playerTracking: {
      powerFloor: EnvUtils.getInteger('PLAYER_POWER_FLOOR', 10000000),
      leftRealmCutoffDays: EnvUtils.getInteger('PLAYER_LEFT_REALM_CUTOFF_DAYS', 7),
      maxSnapshotsPerPlayer: EnvUtils.getInteger('PLAYER_MAX_SNAPSHOTS', 100),
      maxHistoryEntries: EnvUtils.getInteger('PLAYER_MAX_HISTORY', 50),
      enableNameChangeTracking: EnvUtils.getBoolean('PLAYER_ENABLE_NAME_TRACKING', true),
      enableAllianceChangeTracking: EnvUtils.getBoolean('PLAYER_ENABLE_ALLIANCE_TRACKING', true),
      enableRealmStatusTracking: EnvUtils.getBoolean('PLAYER_ENABLE_REALM_STATUS', true),
      enableBattleEfficiencyCalculation: EnvUtils.getBoolean('PLAYER_ENABLE_BATTLE_EFFICIENCY', true)
    },
    
    fileProcessing: {
      maxFileSize: EnvUtils.getInteger('FILE_MAX_SIZE', 50 * 1024 * 1024), // 50MB
      allowedExtensions: EnvUtils.getArray('FILE_ALLOWED_EXTENSIONS', ',', ['.xlsx', '.xls']),
      processingTimeout: EnvUtils.getInteger('FILE_PROCESSING_TIMEOUT', 300000), // 5 minutes
      enableBatchProcessing: EnvUtils.getBoolean('FILE_ENABLE_BATCH', true),
      batchSize: EnvUtils.getInteger('FILE_BATCH_SIZE', 20),
      enableFileValidation: EnvUtils.getBoolean('FILE_ENABLE_VALIDATION', true),
      enableVirusScan: EnvUtils.getBoolean('FILE_ENABLE_VIRUS_SCAN', false),
      enableFileCompression: EnvUtils.getBoolean('FILE_ENABLE_COMPRESSION', false)
    },
    
    api: {
      defaultPageSize: EnvUtils.getInteger('API_DEFAULT_PAGE_SIZE', 20),
      maxPageSize: EnvUtils.getInteger('API_MAX_PAGE_SIZE', 100),
      requestTimeout: EnvUtils.getInteger('API_REQUEST_TIMEOUT', 30000),
      enableRateLimiting: EnvUtils.getBoolean('API_ENABLE_RATE_LIMITING', true),
      rateLimit: {
        windowMs: EnvUtils.getInteger('API_RATE_LIMIT_WINDOW', 60000), // 1 minute
        maxRequests: EnvUtils.getInteger('API_RATE_LIMIT_MAX', 100)
      },
      enableCaching: EnvUtils.getBoolean('API_ENABLE_CACHING', true),
      cacheTimeout: EnvUtils.getInteger('API_CACHE_TIMEOUT', 300), // 5 minutes
      enableApiVersioning: EnvUtils.getBoolean('API_ENABLE_VERSIONING', false)
    },
    
    cache: {
      enabled: EnvUtils.getBoolean('CACHE_ENABLED', true),
      defaultTtlMs: EnvUtils.getInteger('CACHE_DEFAULT_TTL_MS', 300000), // 5 minutes
      maxSize: EnvUtils.getInteger('CACHE_MAX_SIZE', 1000),
      cleanupIntervalMs: EnvUtils.getInteger('CACHE_CLEANUP_INTERVAL_MS', 60000), // 1 minute
      enableTagging: EnvUtils.getBoolean('CACHE_ENABLE_TAGGING', true),
      enableCompression: EnvUtils.getBoolean('CACHE_ENABLE_COMPRESSION', false),
      enableStatistics: EnvUtils.getBoolean('CACHE_ENABLE_STATISTICS', true)
    },
    
    ui: {
      refreshInterval: EnvUtils.getInteger('UI_REFRESH_INTERVAL', 2000),
      errorDisplayDuration: EnvUtils.getInteger('UI_ERROR_DURATION', 5000),
      loadingTimeout: EnvUtils.getInteger('UI_LOADING_TIMEOUT', 10000),
      enableDarkMode: EnvUtils.getBoolean('UI_ENABLE_DARK_MODE', true),
      enableExportFeatures: EnvUtils.getBoolean('UI_ENABLE_EXPORT', true),
      enableAdvancedFiltering: EnvUtils.getBoolean('UI_ENABLE_ADVANCED_FILTERS', true),
      enableRealTimeUpdates: EnvUtils.getBoolean('UI_ENABLE_REALTIME', false),
      maxSearchResults: EnvUtils.getInteger('UI_MAX_SEARCH_RESULTS', 50),
      enableTooltips: EnvUtils.getBoolean('UI_ENABLE_TOOLTIPS', true),
      enableKeyboardShortcuts: EnvUtils.getBoolean('UI_ENABLE_SHORTCUTS', true)
    },
    
    analytics: {
      enableUserTracking: EnvUtils.getBoolean('ANALYTICS_ENABLE_USER_TRACKING', false),
      enablePerformanceMonitoring: EnvUtils.getBoolean('ANALYTICS_ENABLE_PERFORMANCE', true),
      enableErrorTracking: EnvUtils.getBoolean('ANALYTICS_ENABLE_ERROR_TRACKING', true),
      enableUsageStatistics: EnvUtils.getBoolean('ANALYTICS_ENABLE_USAGE_STATS', true),
      retentionDays: EnvUtils.getInteger('ANALYTICS_RETENTION_DAYS', 90),
      enableHeatmaps: EnvUtils.getBoolean('ANALYTICS_ENABLE_HEATMAPS', false)
    },
    
    security: {
      enableCsrfProtection: EnvUtils.getBoolean('SECURITY_ENABLE_CSRF', true),
      enableCors: EnvUtils.getBoolean('SECURITY_ENABLE_CORS', true),
      corsOrigins: EnvUtils.getArray('SECURITY_CORS_ORIGINS', ',', ['http://localhost:3000']),
      enableRequestSigning: EnvUtils.getBoolean('SECURITY_ENABLE_REQUEST_SIGNING', false),
      enableIpWhitelist: EnvUtils.getBoolean('SECURITY_ENABLE_IP_WHITELIST', false),
      ipWhitelist: EnvUtils.getArray('SECURITY_IP_WHITELIST', ',', []),
      enableBruteForceProtection: EnvUtils.getBoolean('SECURITY_ENABLE_BRUTE_FORCE_PROTECTION', true),
      enableSqlInjectionProtection: EnvUtils.getBoolean('SECURITY_ENABLE_SQL_INJECTION_PROTECTION', true)
    },
    
    experimental: {
      enableBetaFeatures: EnvUtils.getBoolean('EXPERIMENTAL_ENABLE_BETA', false),
      enableAlphaFeatures: EnvUtils.getBoolean('EXPERIMENTAL_ENABLE_ALPHA', false),
      features: EnvUtils.getArray('EXPERIMENTAL_FEATURES', ',', [])
    }
  } as FeaturesConfig,
  
  environmentOverrides: {
    development: {
      ui: {
        refreshInterval: 1000,
        errorDisplayDuration: 8000,
        enableDarkMode: true,
        enableAdvancedFiltering: true
      },
      analytics: {
        enableUserTracking: true,
        enablePerformanceMonitoring: true,
        enableErrorTracking: true
      },
      experimental: {
        enableBetaFeatures: true,
        enableAlphaFeatures: true
      }
    },
    test: {
      playerTracking: {
        maxSnapshotsPerPlayer: 10,
        maxHistoryEntries: 5
      },
      fileProcessing: {
        maxFileSize: 1024 * 1024, // 1MB
        processingTimeout: 10000,
        batchSize: 5
      },
      api: {
        defaultPageSize: 5,
        maxPageSize: 20,
        requestTimeout: 5000,
        enableRateLimiting: false,
        enableCaching: false
      },
      cache: {
        enabled: false,
        defaultTtlMs: 60000,
        maxSize: 100,
        cleanupIntervalMs: 30000
      },
      analytics: {
        enableUserTracking: false,
        enablePerformanceMonitoring: false,
        enableErrorTracking: false
      }
    },
    production: {
      ui: {
        refreshInterval: 5000,
        errorDisplayDuration: 3000,
        enableRealTimeUpdates: true
      },
      api: {
        enableRateLimiting: true,
        enableCaching: true,
        cacheTimeout: 600 // 10 minutes
      },
      cache: {
        enabled: true,
        defaultTtlMs: 600000, // 10 minutes
        maxSize: 2000,
        cleanupIntervalMs: 120000 // 2 minutes
      },
      security: {
        enableCsrfProtection: true,
        enableBruteForceProtection: true,
        enableSqlInjectionProtection: true
      },
      experimental: {
        enableBetaFeatures: false,
        enableAlphaFeatures: false
      }
    }
  }
};

/**
 * Get validated features configuration
 */
export function getFeaturesConfig(): FeaturesConfig {
  return loadConfigSection(featuresConfigSection, process.env.NODE_ENV as any);
}

/**
 * Alias for getFeaturesConfig to match naming convention
 */
export function getFeaturesConfiguration(): FeaturesConfig {
  return getFeaturesConfig();
}

/**
 * Feature flag utilities
 */
export class FeatureFlags {
  private static config: FeaturesConfig;
  
  static initialize(config: FeaturesConfig) {
    this.config = config;
  }
  
  static isEnabled(feature: string): boolean {
    if (!this.config) {
      throw new Error('FeatureFlags not initialized. Call FeatureFlags.initialize() first.');
    }
    
    return this.config.experimental.features.includes(feature);
  }
  
  static isBetaEnabled(): boolean {
    return this.config?.experimental?.enableBetaFeatures ?? false;
  }
  
  static isAlphaEnabled(): boolean {
    return this.config?.experimental?.enableAlphaFeatures ?? false;
  }
  
  static getEnabledFeatures(): string[] {
    return this.config?.experimental?.features ?? [];
  }
}

/**
 * Common feature flags
 */
export const FEATURE_FLAGS = {
  // Player features
  ENHANCED_SEARCH: 'enhanced-search',
  BULK_OPERATIONS: 'bulk-operations',
  ADVANCED_ANALYTICS: 'advanced-analytics',
  
  // UI features
  NEW_DASHBOARD: 'new-dashboard',
  MOBILE_APP: 'mobile-app',
  REAL_TIME_NOTIFICATIONS: 'real-time-notifications',
  
  // API features
  GRAPHQL_API: 'graphql-api',
  WEBHOOK_SUPPORT: 'webhook-support',
  ADVANCED_CACHING: 'advanced-caching',
  
  // System features
  MICROSERVICES: 'microservices',
  CLOUD_STORAGE: 'cloud-storage',
  AUTO_SCALING: 'auto-scaling'
} as const;