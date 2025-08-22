/**
 * Logging configuration module
 */

import { ConfigSection, ConfigValidator, EnvUtils, loadConfigSection } from './base';

export interface LoggingConfig {
  readonly level: LogLevel;
  readonly maxEntries: number;
  readonly enableConsole: boolean;
  readonly enablePersistence: boolean;
  readonly enableFileLogging: boolean;
  readonly logDirectory: string;
  readonly maxFileSize: number; // in bytes
  readonly maxFiles: number;
  readonly rotateDaily: boolean;
  readonly enableStructuredLogging: boolean;
  readonly enablePerformanceLogging: boolean;
  readonly slowOperationThreshold: number; // in milliseconds
  readonly enableSanitization: boolean;
  readonly sensitiveFields: string[];
}

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

const loggingConfigSection: ConfigSection<LoggingConfig> = {
  schema: {
    level: ConfigValidator.validateNumber(0, 4),
    maxEntries: ConfigValidator.validateInteger(100, 100000),
    enableConsole: ConfigValidator.validateBoolean(),
    enablePersistence: ConfigValidator.validateBoolean(),
    enableFileLogging: ConfigValidator.validateBoolean(),
    logDirectory: ConfigValidator.validateString(1),
    maxFileSize: ConfigValidator.validateInteger(1024 * 1024, 1024 * 1024 * 1024), // 1MB to 1GB
    maxFiles: ConfigValidator.validateInteger(1, 100),
    rotateDaily: ConfigValidator.validateBoolean(),
    enableStructuredLogging: ConfigValidator.validateBoolean(),
    enablePerformanceLogging: ConfigValidator.validateBoolean(),
    slowOperationThreshold: ConfigValidator.validateInteger(100, 30000),
    enableSanitization: ConfigValidator.validateBoolean(),
    sensitiveFields: ConfigValidator.validateArray(ConfigValidator.validateString())
  },
  
  defaults: {
    level: LogLevel[EnvUtils.getString('LOG_LEVEL', 'INFO')!.toUpperCase() as keyof typeof LogLevel] ?? LogLevel.INFO,
    maxEntries: EnvUtils.getInteger('LOG_MAX_ENTRIES', 1000),
    enableConsole: EnvUtils.getBoolean('LOG_ENABLE_CONSOLE', true),
    enablePersistence: EnvUtils.getBoolean('LOG_ENABLE_PERSISTENCE', false),
    enableFileLogging: EnvUtils.getBoolean('LOG_ENABLE_FILE', false),
    logDirectory: EnvUtils.getString('LOG_DIRECTORY', './logs'),
    maxFileSize: EnvUtils.getInteger('LOG_MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
    maxFiles: EnvUtils.getInteger('LOG_MAX_FILES', 10),
    rotateDaily: EnvUtils.getBoolean('LOG_ROTATE_DAILY', true),
    enableStructuredLogging: EnvUtils.getBoolean('LOG_STRUCTURED', true),
    enablePerformanceLogging: EnvUtils.getBoolean('LOG_PERFORMANCE', false),
    slowOperationThreshold: EnvUtils.getInteger('LOG_SLOW_THRESHOLD', 1000),
    enableSanitization: EnvUtils.getBoolean('LOG_SANITIZE', true),
    sensitiveFields: EnvUtils.getArray('LOG_SENSITIVE_FIELDS', ',', [
      'password', 'token', 'secret', 'key', 'authorization', 'cookie'
    ])
  } as LoggingConfig,
  
  environmentOverrides: {
    development: {
      level: LogLevel.DEBUG,
      enableConsole: true,
      enablePersistence: true,
      enableFileLogging: true,
      enablePerformanceLogging: true,
      slowOperationThreshold: 500
    },
    test: {
      level: LogLevel.ERROR,
      maxEntries: 100,
      enableConsole: false,
      enablePersistence: false,
      enableFileLogging: false,
      enablePerformanceLogging: false
    },
    production: {
      level: LogLevel.WARN,
      maxEntries: 10000,
      enableConsole: false,
      enablePersistence: true,
      enableFileLogging: true,
      enableStructuredLogging: true,
      enableSanitization: true
    }
  }
};

/**
 * Get validated logging configuration
 */
export function getLoggingConfig(): LoggingConfig {
  return loadConfigSection(loggingConfigSection, process.env.NODE_ENV as any);
}

/**
 * Logging utilities
 */
export class LoggingUtils {
  static formatLogLevel(level: LogLevel): string {
    return LogLevel[level] || 'UNKNOWN';
  }

  static shouldLog(messageLevel: LogLevel, configLevel: LogLevel): boolean {
    return messageLevel <= configLevel;
  }

  static sanitizeLogData(data: any, sensitiveFields: string[]): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeLogData(item, sensitiveFields));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();
      const isSensitive = sensitiveFields.some(field => 
        keyLower.includes(field.toLowerCase())
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeLogData(value, sensitiveFields);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  static formatTimestamp(date: Date = new Date()): string {
    return date.toISOString();
  }

  static createLogEntry(
    level: LogLevel,
    source: string,
    message: string,
    data?: any,
    error?: Error
  ): LogEntry {
    return {
      timestamp: this.formatTimestamp(),
      level,
      source,
      message,
      data,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };
  }

  static formatConsoleOutput(entry: LogEntry): string {
    const timestamp = entry.timestamp;
    const level = this.formatLogLevel(entry.level).padEnd(5);
    const source = entry.source.padEnd(20);
    
    let output = `[${timestamp}] ${level} ${source} ${entry.message}`;
    
    if (entry.data) {
      output += ` | Data: ${JSON.stringify(entry.data)}`;
    }
    
    if (entry.error) {
      output += ` | Error: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\nStack: ${entry.error.stack}`;
      }
    }
    
    return output;
  }
}

/**
 * Log entry interface
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  data?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Performance monitoring utilities
 */
export class PerformanceLogger {
  private static timers = new Map<string, number>();

  static startTimer(operation: string): void {
    this.timers.set(operation, Date.now());
  }

  static endTimer(operation: string, config: LoggingConfig): number | null {
    const startTime = this.timers.get(operation);
    if (!startTime) return null;

    const duration = Date.now() - startTime;
    this.timers.delete(operation);

    if (config.enablePerformanceLogging && duration > config.slowOperationThreshold) {
      console.warn(`Slow operation detected: ${operation} took ${duration}ms`);
    }

    return duration;
  }

  static measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    config: LoggingConfig
  ): Promise<T> {
    this.startTimer(operation);
    return fn().finally(() => {
      this.endTimer(operation, config);
    });
  }

  static measure<T>(
    operation: string,
    fn: () => T,
    config: LoggingConfig
  ): T {
    this.startTimer(operation);
    try {
      return fn();
    } finally {
      this.endTimer(operation, config);
    }
  }
}

/**
 * Log categories for structured logging
 */
export enum LogCategory {
  AUTH = 'auth',
  DATABASE = 'database',
  API = 'api',
  UPLOAD = 'upload',
  PLAYER = 'player',
  SYSTEM = 'system',
  ERROR = 'error',
  PERFORMANCE = 'performance'
}

/**
 * Structured log entry
 */
export interface StructuredLogEntry extends LogEntry {
  category: LogCategory;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  duration?: number;
  statusCode?: number;
  metadata?: Record<string, any>;
}