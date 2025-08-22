import { PrismaClient } from '@prisma/client'
import { logInfo, logError, logWarn } from './logger'
import { getDatabaseConfiguration, DatabaseConfig } from '../config'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaPromise: Promise<PrismaClient> | undefined
}

/**
 * Enhance database URL with connection pool parameters
 */
function enhanceDatabaseUrl(baseUrl: string, config: DatabaseConfig): string {
  try {
    const url = new URL(baseUrl);
    
    // Add connection pooling parameters for PostgreSQL
    url.searchParams.set('connection_limit', config.maxConnections.toString());
    url.searchParams.set('pool_timeout', Math.floor(config.connectionPoolTimeout / 1000).toString());
    url.searchParams.set('connect_timeout', Math.floor(config.connectionTimeout / 1000).toString());
    
    // Add additional performance parameters
    url.searchParams.set('statement_timeout', Math.floor(config.queryTimeout).toString());
    url.searchParams.set('application_name', 'player-tracker');
    
    // Enable SSL for production
    if (process.env.NODE_ENV === 'production' && !url.searchParams.has('sslmode')) {
      url.searchParams.set('sslmode', 'require');
    }
    
    logInfo('DB', 'Enhanced database URL with connection pool parameters', {
      maxConnections: config.maxConnections,
      poolTimeout: config.connectionPoolTimeout,
      connectionTimeout: config.connectionTimeout,
      queryTimeout: config.queryTimeout
    });
    
    return url.toString();
  } catch (error) {
    logWarn('DB', 'Failed to enhance database URL, using original', error);
    return baseUrl;
  }
}

// Create PrismaClient with proper error handling
const createPrismaClient = () => {
  const config = getDatabaseConfiguration();
  
  logInfo('DB', 'Creating Prisma client', {
    databaseUrlExists: !!config.url,
    databaseUrlLength: config.url?.length || 0,
    batchSize: config.batchSize,
    maxConnections: config.maxConnections,
    enableLogging: config.enableLogging
  });
  
  if (!config.url) {
    logError('DB', 'Database URL is not configured!');
    // Return a mock client that throws errors when used
    return new Proxy({} as PrismaClient, {
      get(target, prop) {
        if (prop === '$connect' || prop === '$disconnect') {
          return async () => {
            throw new Error('Database URL is not configured - cannot connect to database');
          };
        }
        return () => {
          throw new Error('Database URL is not configured - database operations are not available');
        };
      }
    });
  }
  
  try {
    // Enhance database URL with connection pool parameters
    const enhancedUrl = enhanceDatabaseUrl(config.url, config);
    
    const client = new PrismaClient({
      log: config.enableLogging
        ? ['query', 'error', 'warn', 'info']
        : ['error', 'warn'],
      errorFormat: 'pretty',
      datasources: {
        db: {
          url: enhancedUrl
        }
      }
    })
    
    // Add connection event listeners
    client.$on('error' as never, (e: any) => {
      logError('DB', 'Prisma error occurred', e);
    });
    
    // Add query performance monitoring
    if (config.enableLogging) {
      let queryCount = 0;
      let totalQueryTime = 0;
      
      client.$on('query' as never, (e: any) => {
        queryCount++;
        totalQueryTime += e.duration;
        
        if (e.duration > config.slowQueryThreshold) {
          logWarn('DB', `Slow query detected (${e.duration}ms)`, {
            query: e.query,
            params: e.params,
            duration: e.duration,
            target: e.target,
            averageTime: Math.round(totalQueryTime / queryCount)
          });
        }
        
        // Log query statistics every 100 queries
        if (queryCount % 100 === 0) {
          logInfo('DB', 'Query performance statistics', {
            queryCount,
            averageQueryTime: Math.round(totalQueryTime / queryCount),
            totalQueryTime
          });
        }
      });
    }
    
    logInfo('DB', 'Prisma client created successfully');
    return client;
  } catch (error) {
    logError('DB', 'Failed to create Prisma client', error as Error);
    throw error;
  }
}

// Create the client but don't connect immediately
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  logInfo('DB', 'Prisma client cached in global scope');
}

// Don't automatically connect - let the application handle connection errors
logInfo('DB', 'Prisma client initialized (connection will be established on first use)');

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<{
  isHealthy: boolean;
  error?: string;
  responseTime?: number;
}> {
  const startTime = Date.now();
  
  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;
    
    logInfo('DB', `Database health check passed (${responseTime}ms)`);
    
    return {
      isHealthy: true,
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logError('DB', 'Database health check failed', error as Error, { responseTime });
    
    return {
      isHealthy: false,
      error: errorMessage,
      responseTime
    };
  }
}

/**
 * Get database connection metrics
 */
export function getDatabaseMetrics() {
  const config = getDatabaseConfiguration();
  
  return {
    maxConnections: config.maxConnections,
    connectionTimeout: config.connectionTimeout,
    queryTimeout: config.queryTimeout,
    poolTimeout: config.connectionPoolTimeout,
    batchSize: config.batchSize,
    slowQueryThreshold: config.slowQueryThreshold,
    retryAttempts: config.retryAttempts,
    retryDelay: config.retryDelay
  };
}