/**
 * Centralized configuration management
 * Replaces hardcoded values throughout the application
 */

export interface AppConfig {
  // Database configuration
  database: {
    batchSize: number;
    connectionTimeout: number;
    queryTimeout: number;
  };
  
  // Authentication configuration
  auth: {
    sessionMaxAge: number; // in seconds
    sessionTimeout: number; // in milliseconds
  };
  
  // Logging configuration
  logging: {
    maxEntries: number;
    enableConsole: boolean;
    enablePersistence: boolean;
  };
  
  // Player tracking configuration
  playerTracking: {
    powerFloor: number;
    leftRealmCutoffDays: number;
    maxSnapshotsPerPlayer: number;
    maxHistoryEntries: number;
  };
  
  // File processing configuration
  fileProcessing: {
    maxFileSize: number; // in bytes
    allowedExtensions: string[];
    processingTimeout: number; // in milliseconds
  };
  
  // API configuration
  api: {
    defaultPageSize: number;
    maxPageSize: number;
    requestTimeout: number;
  };
  
  // UI configuration
  ui: {
    refreshInterval: number; // in milliseconds
    errorDisplayDuration: number; // in milliseconds
    loadingTimeout: number; // in milliseconds
  };
}

const defaultConfig: AppConfig = {
  database: {
    batchSize: 20,
    connectionTimeout: 10000,
    queryTimeout: 30000,
  },
  
  auth: {
    sessionMaxAge: 30 * 24 * 60 * 60, // 30 days
    sessionTimeout: 10000, // 10 seconds
  },
  
  logging: {
    maxEntries: 1000,
    enableConsole: process.env.NODE_ENV === 'development',
    enablePersistence: process.env.NODE_ENV === 'development',
  },
  
  playerTracking: {
    powerFloor: 10000000,
    leftRealmCutoffDays: 7,
    maxSnapshotsPerPlayer: 100,
    maxHistoryEntries: 50,
  },
  
  fileProcessing: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedExtensions: ['.xlsx', '.xls'],
    processingTimeout: 300000, // 5 minutes
  },
  
  api: {
    defaultPageSize: 20,
    maxPageSize: 100,
    requestTimeout: 30000,
  },
  
  ui: {
    refreshInterval: 2000,
    errorDisplayDuration: 5000,
    loadingTimeout: 10000,
  },
};

/**
 * Environment-specific configuration overrides
 */
const environmentOverrides: Partial<AppConfig> = {
  ...(process.env.NODE_ENV === 'production' && {
    logging: {
      maxEntries: 100,
      enableConsole: false,
      enablePersistence: false,
    },
    ui: {
      refreshInterval: 5000,
      errorDisplayDuration: 3000,
      loadingTimeout: 15000,
    },
  }),
  
  ...(process.env.NODE_ENV === 'test' && {
    database: {
      batchSize: 5,
      connectionTimeout: 5000,
      queryTimeout: 10000,
    },
    auth: {
      sessionMaxAge: 60, // 1 minute for tests
      sessionTimeout: 1000,
    },
  }),
};

/**
 * Merge default config with environment overrides
 */
function createConfig(): AppConfig {
  return {
    database: { ...defaultConfig.database, ...environmentOverrides.database },
    auth: { ...defaultConfig.auth, ...environmentOverrides.auth },
    logging: { ...defaultConfig.logging, ...environmentOverrides.logging },
    playerTracking: { ...defaultConfig.playerTracking, ...environmentOverrides.playerTracking },
    fileProcessing: { ...defaultConfig.fileProcessing, ...environmentOverrides.fileProcessing },
    api: { ...defaultConfig.api, ...environmentOverrides.api },
    ui: { ...defaultConfig.ui, ...environmentOverrides.ui },
  };
}

/**
 * Application configuration singleton
 */
export const config = createConfig();

/**
 * Environment variable validation
 */
export const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
] as const;

export const optionalEnvVars = [
  'NEXTAUTH_URL',
  'LOG_LEVEL',
] as const;

/**
 * Validate that all required environment variables are present
 */
export function validateEnvironmentVariables(): void {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Get configuration value with type safety
 */
export function getConfig<K extends keyof AppConfig>(section: K): AppConfig[K] {
  return config[section];
}

/**
 * Get specific configuration value with dot notation
 */
export function getConfigValue<T>(path: string, defaultValue?: T): T {
  const keys = path.split('.');
  let value: any = config;
  
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Configuration value not found: ${path}`);
    }
  }
  
  return value as T;
}

/**
 * Check if we're in development mode
 */
export const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Check if we're in production mode
 */
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Check if we're in test mode
 */
export const isTest = process.env.NODE_ENV === 'test';