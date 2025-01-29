import { PrismaClient } from '@prisma/client/edge'
import { Pool } from '@neondatabase/serverless'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const pool = new Pool({ connectionString: process.env.POSTGRES_URL_NON_POOLING })

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: `prisma://${process.env.POSTGRES_URL_NON_POOLING}`
    }
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma 