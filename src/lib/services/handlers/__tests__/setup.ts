import { PrismaClient } from '@prisma/client'
import { Redis } from 'ioredis-mock'

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    template: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'test-template',
        name: 'TestTemplate',
        jsonBot: JSON.stringify({
          handlers: {
            'test-template': []
          }
        })
      })
    }
  }))
}))

// Mock Redis
jest.mock('ioredis', () => require('ioredis-mock'))

// Mock SearchMonitoring
jest.mock('../../monitoring/SearchMonitoring', () => ({
  SearchMonitoring: jest.fn().mockImplementation(() => ({
    recordSuccess: jest.fn(),
    recordError: jest.fn()
  }))
}))

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks()
}) 