import { PrismaClient } from '@prisma/client'
import { logInfo, logError, logWarn } from './logger'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaPromise: Promise<PrismaClient> | undefined
}

// Create PrismaClient with proper error handling
const createPrismaClient = () => {
  logInfo('DB', 'Creating Prisma client', {
    databaseUrlExists: !!process.env.DATABASE_URL,
    databaseUrlLength: process.env.DATABASE_URL?.length || 0
  });
  
  if (!process.env.DATABASE_URL) {
    logError('DB', 'DATABASE_URL environment variable is not set!');
    // Return a mock client that throws errors when used
    return new Proxy({} as PrismaClient, {
      get(target, prop) {
        if (prop === '$connect' || prop === '$disconnect') {
          return async () => {
            throw new Error('DATABASE_URL environment variable is not set - cannot connect to database');
          };
        }
        return () => {
          throw new Error('DATABASE_URL environment variable is not set - database operations are not available');
        };
      }
    });
  }
  
  try {
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn', 'info']
        : ['error', 'warn'],
      errorFormat: 'pretty',
    })
    
    // Add connection event listeners
    client.$on('error' as never, (e: any) => {
      logError('DB', 'Prisma error occurred', e);
    });
    
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