// @ts-nocheck
import { config } from 'dotenv'
import path from 'path'
import { afterAll, beforeAll, jest } from '@jest/globals'

// Lade .env.test Datei
config({ path: path.resolve(process.cwd(), '.env.test') })

// Setze Test-spezifische Umgebungsvariablen
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.REDIS_TEST_URL = 'redis://localhost:6379/1'  // Separate Test-Datenbank
process.env.PINECONE_INDEX = 'dialog-engine-test'
process.env.PINECONE_API_KEY = 'test-api-key'
process.env.OPENAI_API_KEY = 'test-api-key'
process.env.PINECONE_ENVIRONMENT = 'gcp-starter'

// Globale Typen
declare global {
  var waitFor: (ms: number) => Promise<void>
}

// Globale Test-Timeouts
jest.setTimeout(10000)

// Globale Mocks
const mockRedisStorage = new Map()

// Redis Mock-Implementierung
const mockRedisClient = {
  get: jest.fn().mockImplementation((key) => Promise.resolve(mockRedisStorage.get(key))),
  set: jest.fn().mockImplementation((key, value, mode, duration) => {
    mockRedisStorage.set(key, value)
    return Promise.resolve('OK')
  }),
  del: jest.fn().mockImplementation((key) => {
    mockRedisStorage.delete(key)
    return Promise.resolve(1)
  }),
  keys: jest.fn().mockImplementation((pattern) => {
    const keys = Array.from(mockRedisStorage.keys())
    return Promise.resolve(keys.filter(key => key.startsWith(pattern.replace('*', ''))))
  }),
  hset: jest.fn().mockResolvedValue(1),
  hget: jest.fn().mockResolvedValue(null),
  hgetall: jest.fn().mockResolvedValue({}),
  expire: jest.fn().mockResolvedValue(1),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  on: jest.fn()
}

// Mock Redis
jest.mock('ioredis', () => {
  const Redis = jest.fn().mockImplementation(() => mockRedisClient)
  return { Redis }
})

// Mock Pinecone
jest.mock('@pinecone-database/pinecone', () => ({
  Pinecone: jest.fn().mockImplementation(() => ({
    index: jest.fn().mockReturnValue({
      namespace: jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ upsertedCount: 1 }),
        query: jest.fn().mockResolvedValue({
          matches: [{
            id: 'test-doc-1',
            score: 0.98,
            metadata: {
              type: 'medical',
              title: 'Informationen zur Grippeimpfung',
              content: 'Wichtige Informationen zur jährlichen Grippeimpfung'
            }
          }]
        }),
        deleteAll: jest.fn().mockResolvedValue(undefined)
      }),
      describeIndexStats: jest.fn().mockResolvedValue({ namespaces: {} }),
      deleteIndex: jest.fn().mockResolvedValue(undefined),
      upsert: jest.fn().mockResolvedValue({ upsertedCount: 1 }),
      query: jest.fn().mockResolvedValue({
        matches: [{
          id: 'test-doc-1',
          score: 0.98,
          metadata: {
            type: 'medical',
            title: 'Informationen zur Grippeimpfung',
            content: 'Wichtige Informationen zur jährlichen Grippeimpfung'
          }
        }]
      })
    }),
    createIndex: jest.fn().mockResolvedValue(undefined),
    listIndexes: jest.fn().mockResolvedValue({ indexes: [] }),
    describeIndex: jest.fn().mockResolvedValue({ status: { ready: true } })
  }))
}))

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{
          embedding: Array(1536).fill(0.1)
        }]
      })
    },
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                type: "medical",
                confidence: 0.95,
                explanation: "Der Text enthält medizinische Fachbegriffe und Informationen zur Grippeimpfung."
              })
            }
          }]
        })
      }
    }
  }))
}))

// Fehler-Logging unterdrücken
console.error = jest.fn()
console.warn = jest.fn()

// Globale Test-Hilfsfunktionen
global.waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Mock für File API
class MockFile implements Partial<File> {
  name: string
  type: string
  size: number
  lastModified: number
  webkitRelativePath: string
  private content: string

  constructor(parts: BlobPart[], filename: string, options?: FilePropertyBag) {
    this.name = filename
    this.type = options?.type || 'text/plain'
    this.content = parts[0] as string
    this.size = this.content.length
    this.lastModified = Date.now()
    this.webkitRelativePath = ''
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const encoder = new TextEncoder()
    const uint8Array = encoder.encode(this.content)
    const buffer = new ArrayBuffer(uint8Array.length)
    const view = new Uint8Array(buffer)
    view.set(uint8Array)
    return buffer
  }

  async text(): Promise<string> {
    return this.content
  }

  slice(start?: number, end?: number, contentType?: string): Blob {
    const slicedContent = this.content.slice(start, end)
    return new Blob([slicedContent], { type: contentType || this.type })
  }
}

// @ts-ignore - Wir überschreiben den globalen File-Typ für Tests
global.File = MockFile

// Setup vor allen Tests
beforeAll(async () => {
  // Hier können wir globale Setup-Operationen durchführen
  console.log('Test-Umgebungsvariablen:', {
    REDIS_URL: process.env.REDIS_URL,
    PINECONE_INDEX: process.env.PINECONE_INDEX,
    PINECONE_API_KEY: !!process.env.PINECONE_API_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
  })
})

// Cleanup nach allen Tests
afterAll(async () => {
  // Hier können wir globale Cleanup-Operationen durchführen
})

// Aufräumen nach jedem Test
afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
}) 