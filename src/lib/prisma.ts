import { PrismaClient } from '@prisma/client/edge'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const connectionString = process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING || ''

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'],
  datasourceUrl: connectionString
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma 