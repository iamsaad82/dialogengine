import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error'],
    datasourceUrl: process.env.POSTGRES_PRISMA_URL
  })
} else {
  // Prevent multiple instances in development
  if (!(global as any).prisma) {
    (global as any).prisma = new PrismaClient({
      log: ['error'],
      datasourceUrl: process.env.POSTGRES_PRISMA_URL
    })
  }
  prisma = (global as any).prisma
}

export { prisma } 