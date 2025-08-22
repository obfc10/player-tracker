/**
 * Database configuration module
 */

import { ConfigSection, ConfigValidator, EnvUtils, loadConfigSection } from './base';

export interface DatabaseConfig {
  readonly url: string;
  readonly batchSize: number;
  readonly connectionTimeout: number;
  readonly queryTimeout: number;
  readonly maxConnections: number;
  readonly retryAttempts: number;
  readonly retryDelay: number;
  readonly enableLogging: boolean;
  readonly slowQueryThreshold: number;
  readonly connectionPoolTimeout: number;
}

const databaseConfigSection: ConfigSection<DatabaseConfig> = {
  schema: {
    url: ConfigValidator.validateString(1),
    batchSize: ConfigValidator.validateInteger(1, 1000),
    connectionTimeout: ConfigValidator.validateInteger(1000, 60000),
    queryTimeout: ConfigValidator.validateInteger(5000, 300000),
    maxConnections: ConfigValidator.validateInteger(1, 100),
    retryAttempts: ConfigValidator.validateInteger(0, 10),
    retryDelay: ConfigValidator.validateInteger(100, 10000),
    enableLogging: ConfigValidator.validateBoolean(),
    slowQueryThreshold: ConfigValidator.validateInteger(100, 10000),
    connectionPoolTimeout: ConfigValidator.validateInteger(1000, 30000)
  },
  
  defaults: {
    url: EnvUtils.require('DATABASE_URL'),
    batchSize: EnvUtils.getInteger('DB_BATCH_SIZE', 20),
    connectionTimeout: EnvUtils.getInteger('DB_CONNECTION_TIMEOUT', 10000),
    queryTimeout: EnvUtils.getInteger('DB_QUERY_TIMEOUT', 30000),
    maxConnections: EnvUtils.getInteger('DB_MAX_CONNECTIONS', 10),
    retryAttempts: EnvUtils.getInteger('DB_RETRY_ATTEMPTS', 3),
    retryDelay: EnvUtils.getInteger('DB_RETRY_DELAY', 1000),
    enableLogging: EnvUtils.getBoolean('DB_ENABLE_LOGGING', false),
    slowQueryThreshold: EnvUtils.getInteger('DB_SLOW_QUERY_THRESHOLD', 1000),
    connectionPoolTimeout: EnvUtils.getInteger('DB_POOL_TIMEOUT', 10000)
  } as DatabaseConfig,
  
  environmentOverrides: {
    development: {
      enableLogging: true,
      slowQueryThreshold: 500,
      batchSize: 10
    },
    test: {
      batchSize: 5,
      connectionTimeout: 5000,
      queryTimeout: 10000,
      maxConnections: 3
    },
    production: {
      enableLogging: false,
      maxConnections: 20,
      batchSize: 50
    }
  }
};

/**
 * Get validated database configuration
 */
export function getDatabaseConfig(): DatabaseConfig {
  return loadConfigSection(databaseConfigSection, process.env.NODE_ENV as any);
}

/**
 * Database connection utilities
 */
export class DatabaseUtils {
  static formatConnectionString(config: DatabaseConfig): string {
    const url = new URL(config.url);
    
    // Add connection pool parameters
    url.searchParams.set('connection_limit', config.maxConnections.toString());
    url.searchParams.set('pool_timeout', (config.connectionPoolTimeout / 1000).toString());
    
    return url.toString();
  }

  static validateConnection(config: DatabaseConfig): Promise<boolean> {
    // This would typically test the database connection
    // For now, just validate the URL format
    try {
      new URL(config.url);
      return Promise.resolve(true);
    } catch {
      return Promise.resolve(false);
    }
  }

  static getConnectionMetrics() {
    return {
      activeConnections: 0, // Would be populated from actual pool
      idleConnections: 0,
      totalConnections: 0,
      queryCount: 0,
      averageQueryTime: 0
    };
  }
}

/**
 * Database configuration constants
 */
export const DATABASE_CONSTANTS = {
  MIN_BATCH_SIZE: 1,
  MAX_BATCH_SIZE: 1000,
  DEFAULT_TIMEOUT: 30000,
  MAX_RETRY_ATTEMPTS: 10,
  SLOW_QUERY_WARNING: 1000,
  CONNECTION_HEALTH_CHECK_INTERVAL: 30000
} as const;

/**
 * Database error types
 */
export enum DatabaseErrorType {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  QUERY_TIMEOUT = 'QUERY_TIMEOUT',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  DEADLOCK = 'DEADLOCK',
  POOL_EXHAUSTED = 'POOL_EXHAUSTED'
}

export class DatabaseError extends Error {
  constructor(
    public type: DatabaseErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}