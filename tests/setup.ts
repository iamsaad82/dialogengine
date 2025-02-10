import { config } from 'dotenv'
import path from 'path'
import { afterAll, beforeAll } from '@jest/globals'

// Lade Umgebungsvariablen aus .env.development
config({ path: path.resolve(process.cwd(), '.env.development') })

// Setze Test-spezifische Umgebungsvariablen
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
process.env.PINECONE_INDEX = 'dialog-engine-test' // Separater Test-Index

// Globale Test-Timeouts
jest.setTimeout(30000) // 30 Sekunden

// Setup vor allen Tests
beforeAll(async () => {
  // Hier können wir globale Setup-Operationen durchführen
})

// Cleanup nach allen Tests
afterAll(async () => {
  // Hier können wir globale Cleanup-Operationen durchführen
}) 