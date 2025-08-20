// Global error tracking system
export type ErrorLogType = 'error' | 'warning' | 'info';

export interface ErrorContext {
  filename?: string;
  lineno?: number;
  colno?: number;
  promise?: Promise<unknown>;
  args?: unknown[];
  url?: string | URL | Request;
  status?: number;
  statusText?: string;
  [key: string]: unknown;
}

export interface ErrorLog {
  timestamp: string;
  type: ErrorLogType;
  source: string;
  message: string;
  stack?: string;
  context?: ErrorContext;
}

export interface ErrorSummary {
  total: number;
  errors: number;
  warnings: number;
  info: number;
  bySource: Record<string, number>;
  recent: ErrorLog[];
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private errors: ErrorLog[] = [];
  private maxErrors = 100;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupGlobalErrorHandlers();
    }
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  private setupGlobalErrorHandlers(): void {
    // Catch unhandled errors
    window.addEventListener('error', (event: ErrorEvent) => {
      this.logError('window.error', event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      this.logError('unhandledrejection', event.reason, {
        promise: event.promise,
      });
    });

    // Override console.error to capture all errors
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      this.logError('console.error', args.join(' '), { args });
      originalError.apply(console, args);
    };

    // Track fetch errors
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          this.logWarning('fetch.error', `HTTP ${response.status}: ${response.statusText}`, {
            url: args[0],
            status: response.status,
            statusText: response.statusText,
          });
        }
        return response;
      } catch (error) {
        this.logError('fetch.exception', error, { url: args[0] });
        throw error;
      }
    };
  }

  logError(source: string, error: unknown, context?: ErrorContext): void {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      type: 'error',
      source,
      message: this.extractErrorMessage(error),
      stack: this.extractErrorStack(error),
      context,
    };

    this.addLog(errorLog);
    console.log(`[ErrorTracker] ${source}:`, errorLog);
  }

  logWarning(source: string, message: string, context?: ErrorContext): void {
    const log: ErrorLog = {
      timestamp: new Date().toISOString(),
      type: 'warning',
      source,
      message,
      context,
    };

    this.addLog(log);
    console.log(`[ErrorTracker] ${source}:`, log);
  }

  logInfo(source: string, message: string, context?: ErrorContext): void {
    const log: ErrorLog = {
      timestamp: new Date().toISOString(),
      type: 'info',
      source,
      message,
      context,
    };

    this.addLog(log);
    console.log(`[ErrorTracker] ${source}:`, log);
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return String(error);
  }

  private extractErrorStack(error: unknown): string | undefined {
    if (error instanceof Error) {
      return error.stack;
    }
    return undefined;
  }

  private addLog(log: ErrorLog): void {
    this.errors.push(log);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
  }

  getErrors(): ErrorLog[] {
    return [...this.errors];
  }

  getErrorsSummary(): ErrorSummary {
    const summary: ErrorSummary = {
      total: this.errors.length,
      errors: this.errors.filter(e => e.type === 'error').length,
      warnings: this.errors.filter(e => e.type === 'warning').length,
      info: this.errors.filter(e => e.type === 'info').length,
      bySource: {},
      recent: this.errors.slice(-10),
    };

    this.errors.forEach(error => {
      summary.bySource[error.source] = (summary.bySource[error.source] || 0) + 1;
    });

    return summary;
  }

  clearErrors(): void {
    this.errors = [];
  }

  updateMaxErrors(maxErrors: number): void {
    this.maxErrors = maxErrors;
    if (this.errors.length > maxErrors) {
      this.errors = this.errors.slice(-maxErrors);
    }
  }
}

export const errorTracker = ErrorTracker.getInstance();