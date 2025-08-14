import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Only create PrismaClient if DATABASE_URL is available
export const prisma = globalForPrisma.prisma ?? 
  (process.env.DATABASE_URL ? new PrismaClient() : null as any)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma