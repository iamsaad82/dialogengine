import { PrismaClient } from '@prisma/client/edge'
import { Pool } from '@neondatabase/serverless'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const connectionString = process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING || ''
const apiKey = new URL(connectionString).password

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: `prisma://proxy.proxy.neon.tech?api_key=${apiKey}`
    }
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma 