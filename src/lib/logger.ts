/**
 * Centralized logging service with environment-based levels
 * Replaces scattered console.log statements throughout the application
 */

// Conditional import for server-side only
let loggingConfig: any = null;
let LogLevel: any = null;

if (typeof window === 'undefined') {
  try {
    const configModule = require('../config');
    loggingConfig = configModule.getLoggingConfiguration();
    LogLevel = configModule.LogLevel;
  } catch (error) {
    console.warn('Failed to load logging configuration:', error);
  }
} else {
  // Client-side fallback
  LogLevel = {
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    DEBUG: 4
  };
}

export { LogLevel };

export interface LogEntry {
  timestamp: string;
  level: any;
  source: string;
  message: string;
  data?: any;
  error?: Error;
}

export interface LoggerConfig {
  level: number;
  enableConsole: boolean;
  enablePersistence: boolean;
  maxEntries: number;
}

class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private entries: LogEntry[] = [];

  private constructor() {
    // Use loaded config or fallback for client side
    if (loggingConfig) {
      this.config = {
        level: loggingConfig.level,
        enableConsole: loggingConfig.enableConsole,
        enablePersistence: loggingConfig.enablePersistence,
        maxEntries: loggingConfig.maxEntries,
      };
    } else {
      // Client-side fallback configuration
      this.config = {
        level: LogLevel.INFO,
        enableConsole: true,
        enablePersistence: false,
        maxEntries: 100,
      };
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getLogLevelFromEnv(): number {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'ERROR':
        return LogLevel.ERROR;
      case 'WARN':
        return LogLevel.WARN;
      case 'INFO':
        return LogLevel.INFO;
      case 'DEBUG':
        return LogLevel.DEBUG;
      default:
        return process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG;
    }
  }

  private shouldLog(level: number): boolean {
    return level <= this.config.level;
  }

  private createLogEntry(level: number, source: string, message: string, data?: any, error?: Error): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      data,
      error,
    };
  }

  private persistEntry(entry: LogEntry): void {
    if (!this.config.enablePersistence) return;

    this.entries.push(entry);
    if (this.entries.length > this.config.maxEntries) {
      this.entries.shift();
    }
  }

  private outputToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const prefix = `[${entry.timestamp}] [${entry.source}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(message, entry.data || '', entry.error || '');
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(message, entry.data || '');
        break;
      case LogLevel.DEBUG:
        console.log(message, entry.data || '');
        break;
    }
  }

  private log(level: number, source: string, message: string, data?: any, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, source, message, data, error);
    this.persistEntry(entry);
    this.outputToConsole(entry);
  }

  error(source: string, message: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, source, message, data, error);
  }

  warn(source: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, source, message, data);
  }

  info(source: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, source, message, data);
  }

  debug(source: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, source, message, data);
  }

  // Utility methods for common logging patterns
  apiRequest(method: string, path: string, userId?: string): void {
    this.info('API', `${method} ${path}`, { userId });
  }

  apiResponse(method: string, path: string, status: number, duration?: number): void {
    this.info('API', `${method} ${path} -> ${status}`, { duration });
  }

  dbQuery(operation: string, table: string, duration?: number): void {
    this.debug('DB', `${operation} on ${table}`, { duration });
  }

  authEvent(event: string, userId?: string, details?: any): void {
    this.info('AUTH', event, { userId, ...details });
  }

  // Get logs for debugging (development only)
  getLogs(level?: number): LogEntry[] {
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    
    if (level !== undefined) {
      return this.entries.filter(entry => entry.level === level);
    }
    return [...this.entries];
  }

  // Clear logs (development only)
  clearLogs(): void {
    if (process.env.NODE_ENV !== 'production') {
      this.entries = [];
    }
  }

  // Update configuration
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions for common use cases
export const logError = (source: string, message: string, error?: Error, data?: any) => 
  logger.error(source, message, error, data);

export const logWarn = (source: string, message: string, data?: any) => 
  logger.warn(source, message, data);

export const logInfo = (source: string, message: string, data?: any) => 
  logger.info(source, message, data);

export const logDebug = (source: string, message: string, data?: any) => 
  logger.debug(source, message, data);

// API-specific logging helpers
export const logApiRequest = (method: string, path: string, userId?: string) => 
  logger.apiRequest(method, path, userId);

export const logApiResponse = (method: string, path: string, status: number, duration?: number) => 
  logger.apiResponse(method, path, status, duration);

export const logDbQuery = (operation: string, table: string, duration?: number) => 
  logger.dbQuery(operation, table, duration);

export const logAuthEvent = (event: string, userId?: string, details?: any) => 
  logger.authEvent(event, userId, details);