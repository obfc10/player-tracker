/**
 * Main configuration module
 * Combines all domain-specific configurations into a unified interface
 */

import { createBaseConfig, BaseConfig } from './base';
import { getDatabaseConfig, DatabaseConfig } from './database';
import { getAuthConfig, AuthConfig } from './auth';
import { getLoggingConfig, LoggingConfig } from './logging';
import { getFeaturesConfig, FeaturesConfig } from './features';

export interface AppConfig {
  readonly base: BaseConfig;
  readonly database: DatabaseConfig;
  readonly auth: AuthConfig;
  readonly logging: LoggingConfig;
  readonly features: FeaturesConfig;
}

/**
 * Global configuration instance
 */
let configInstance: AppConfig | null = null;

/**
 * Initialize and get the complete application configuration
 */
export function getAppConfig(): AppConfig {
  if (!configInstance) {
    configInstance = {
      base: createBaseConfig(),
      database: getDatabaseConfig(),
      auth: getAuthConfig(),
      logging: getLoggingConfig(),
      features: getFeaturesConfig()
    };
  }
  
  return configInstance;
}

/**
 * Reset configuration (useful for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}

/**
 * Get specific configuration sections
 */
export function getBaseConfig(): BaseConfig {
  return getAppConfig().base;
}

export function getDatabaseConfiguration(): DatabaseConfig {
  return getAppConfig().database;
}

export function getAuthConfiguration(): AuthConfig {
  return getAppConfig().auth;
}

export function getLoggingConfiguration(): LoggingConfig {
  return getAppConfig().logging;
}

export function getFeaturesConfiguration(): FeaturesConfig {
  return getAppConfig().features;
}

/**
 * Configuration validation utilities
 */
export class ConfigUtils {
  static validateAppConfig(config: AppConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate critical configuration
    if (!config.database.url) {
      errors.push('Database URL is required');
    }

    if (!config.auth.secretKey) {
      errors.push('Auth secret key is required');
    }

    if (config.auth.bcryptRounds < 8) {
      errors.push('BCrypt rounds should be at least 8 for security');
    }

    if (config.database.maxConnections < 1) {
      errors.push('Database max connections must be at least 1');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static getConfigSummary(config: AppConfig): Record<string, any> {
    return {
      environment: config.base.environment,
      version: config.base.version,
      databaseConfigured: !!config.database.url,
      authConfigured: !!config.auth.secretKey,
      loggingLevel: config.logging.level,
      featuresEnabled: {
        playerTracking: config.features.playerTracking.enableNameChangeTracking,
        fileProcessing: config.features.fileProcessing.enableBatchProcessing,
        apiCaching: config.features.api.enableCaching,
        analytics: config.features.analytics.enablePerformanceMonitoring
      }
    };
  }

  static logConfigurationStatus(): void {
    const config = getAppConfig();
    const validation = this.validateAppConfig(config);
    const summary = this.getConfigSummary(config);

    console.log('Configuration Status:', {
      valid: validation.isValid,
      errors: validation.errors,
      summary
    });

    if (!validation.isValid) {
      console.error('Configuration validation failed:', validation.errors);
    }
  }
}

/**
 * Environment-specific configuration helpers
 */
export class EnvironmentConfig {
  static isDevelopment(): boolean {
    return getBaseConfig().environment === 'development';
  }

  static isProduction(): boolean {
    return getBaseConfig().environment === 'production';
  }

  static isTest(): boolean {
    return getBaseConfig().environment === 'test';
  }

  static getEnvironmentDefaults(): Partial<AppConfig> {
    const env = getBaseConfig().environment;

    switch (env) {
      case 'development':
        return {
          logging: {
            ...getLoggingConfiguration(),
            level: 3, // DEBUG
            enableConsole: true,
            enablePerformanceLogging: true
          },
          features: {
            ...getFeaturesConfiguration(),
            ui: {
              ...getFeaturesConfiguration().ui,
              refreshInterval: 1000,
              enableDarkMode: true
            }
          }
        };

      case 'production':
        return {
          logging: {
            ...getLoggingConfiguration(),
            level: 1, // WARN
            enableConsole: false,
            enableFileLogging: true
          },
          features: {
            ...getFeaturesConfiguration(),
            api: {
              ...getFeaturesConfiguration().api,
              enableCaching: true,
              enableRateLimiting: true
            }
          }
        };

      case 'test':
        return {
          logging: {
            ...getLoggingConfiguration(),
            level: 0, // ERROR
            enableConsole: false,
            enablePersistence: false
          },
          database: {
            ...getDatabaseConfiguration(),
            batchSize: 5,
            maxConnections: 3
          }
        };

      default:
        return {};
    }
  }
}

// Re-export all configuration types and utilities
export * from './base';
export * from './database';
export * from './auth';
export * from './logging';
export * from './features';

// Export specific commonly used types
export { LogLevel } from './logging';

// Initialize configuration on module load
try {
  const config = getAppConfig();
  ConfigUtils.logConfigurationStatus();
} catch (error) {
  console.error('Failed to initialize configuration:', error);
  process.exit(1);
}