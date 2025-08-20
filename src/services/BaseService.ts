import { ServiceError } from '@/types/api';
import { logError, logInfo, logWarn } from '@/lib/logger';
import { handlePrismaError, isServiceError } from '@/lib/error-handler';

export abstract class BaseService {
  protected readonly serviceName: string;

  constructor() {
    this.serviceName = this.constructor.name;
  }

  protected handleError(error: any, context: string): never {
    logError(this.serviceName, `Error in ${context}`, error as Error);
    
    if (isServiceError(error)) {
      throw error;
    }
    
    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      throw handlePrismaError(error, `${this.serviceName}.${context}`);
    }
    
    throw new ServiceError(
      error.message || 'An unexpected error occurred',
      'INTERNAL_ERROR',
      500,
      { originalError: error, context }
    );
  }
  
  protected logInfo(context: string, message: string, data?: any): void {
    logInfo(this.serviceName, `${context}: ${message}`, data);
  }
  
  protected logWarning(context: string, message: string, data?: any): void {
    logWarn(this.serviceName, `${context}: ${message}`, data);
  }

  protected logDebug(context: string, message: string, data?: any): void {
    logInfo(this.serviceName, `[DEBUG] ${context}: ${message}`, data);
  }

  /**
   * Executes a database operation with proper error handling and logging
   */
  protected async executeDbOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: any
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      this.logDebug('executeDbOperation', `Starting ${operationName}`, context);
      const result = await operation();
      const duration = Date.now() - startTime;
      this.logDebug('executeDbOperation', `Completed ${operationName}`, { duration, context });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logError('executeDbOperation', `Failed ${operationName}`, error as Error, { duration, context });
      throw this.handleError(error, operationName);
    }
  }

  /**
   * Validates required parameters
   */
  protected validateRequired(params: Record<string, any>, requiredFields: string[]): void {
    const missing = requiredFields.filter(field =>
      params[field] === undefined || params[field] === null || params[field] === ''
    );

    if (missing.length > 0) {
      throw new ServiceError(
        `Missing required parameters: ${missing.join(', ')}`,
        'VALIDATION_ERROR',
        400,
        { missing, provided: Object.keys(params) }
      );
    }
  }

  /**
   * Logs an error with service context
   */
  protected logError(context: string, message: string, error: Error, data?: any): void {
    logError(this.serviceName, `${context}: ${message}`, error, data);
  }
}