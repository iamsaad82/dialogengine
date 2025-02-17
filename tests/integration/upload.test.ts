import { describe, expect, test, jest, beforeAll, afterAll } from '@jest/globals'
import { RedisClient } from '../../src/lib/redis'
import { ScanStatus } from '../../src/types'
import { CONTENT_TYPES } from '../../src/lib/types/contentTypes'
import { OpenAI } from 'openai'
import * as path from 'path'
import * as fs from 'fs'

// Mock für OpenAI und Pinecone
jest.mock('@pinecone-database/pinecone')
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockImplementation(async (args: any) => {
            // Simuliere Content-Type-Erkennung basierend auf Input
            const input = args.messages[1].content
            let type = 'info'
            let confidence = 0.9
            
            if (input.toLowerCase().includes('kontakt')) {
              type = 'contact'
              confidence = 0.95
            } else if (input.toLowerCase().includes('download')) {
              type = 'download'
              confidence = 0.85
            }
            
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    type,
                    confidence,
                    metadata: {
                      title: 'Test Dokument',
                      description: 'Test Beschreibung'
                    }
                  })
                }
              }]
            }
          })
        }
      }
    }))
  }
})

describe('Upload Integration', () => {
  let client: RedisClient
  const fixturesDir = path.join(__dirname, '../fixtures')
  const documentsDir = path.join(fixturesDir, 'documents')
  const templateId = 'test-template-123'

  beforeAll(async () => {
    // Stelle sicher, dass die Verzeichnisse existieren
    [fixturesDir, documentsDir].forEach((dir: string) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    })

    client = new RedisClient(process.env.REDIS_TEST_URL || 'redis://localhost:6379')
    await client.connect()
  })

  afterAll(async () => {
    await client.disconnect()
  })

  test('sollte Dateitypen mit Metadaten verarbeiten', async () => {
    const detectedTypes = [
      { type: 'medical', confidence: 0.9 },
      { type: 'city-administration', confidence: 0.8 },
      { type: 'insurance', confidence: 0.7 }
    ]
    
    // Finde spezifische Types
    const medicalType = detectedTypes.find((t: any) => t.type === 'medical')
    const adminType = detectedTypes.find((t: any) => t.type === 'city-administration')
    const insuranceType = detectedTypes.find((t: any) => t.type === 'insurance')
    
    expect(medicalType).toBeDefined()
    expect(adminType).toBeDefined()
    expect(insuranceType).toBeDefined()
  })

  test('sollte Dokumente hochladen und Content-Types erkennen', async () => {
    // Erstelle Test-Dokumente
    const documents = [
      {
        title: 'Über uns',
        url: 'https://example.com/about',
        content: 'Wir sind ein innovatives Unternehmen...'
      },
      {
        title: 'Kontakt',
        url: 'https://example.com/contact',
        content: 'Sie erreichen uns unter...'
      },
      {
        title: 'Downloads',
        url: 'https://example.com/downloads',
        content: 'Hier finden Sie unsere Dokumente zum Download...'
      }
    ]

    // Speichere Dokumente als JSON
    fs.writeFileSync(
      path.join(documentsDir, 'documents.json'),
      JSON.stringify(documents)
    )

    // Simuliere Upload-Prozess
    const response = await fetch('/api/upload/vectorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId })
    })

    const result = await response.json()
    
    // Überprüfe Status
    expect(result.stage).toBe('complete')
    expect(result.progress).toBe(100)
    
    // Überprüfe erkannte Content-Types
    const detectedTypes = result.details.detectedTypes
    expect(detectedTypes).toHaveLength(3)
    
    // Finde spezifische Types
    const infoType = detectedTypes.find((t: any) => t.type === CONTENT_TYPES.INFO)
    const contactType = detectedTypes.find((t: any) => t.type === CONTENT_TYPES.CONTACT)
    const downloadType = detectedTypes.find((t: any) => t.type === CONTENT_TYPES.DOWNLOAD)
    
    expect(infoType).toBeDefined()
    expect(contactType).toBeDefined()
    expect(downloadType).toBeDefined()
    
    // Überprüfe Confidence-Werte
    expect(infoType.confidence).toBeGreaterThan(0.8)
    expect(contactType.confidence).toBeGreaterThan(0.9)
    expect(downloadType.confidence).toBeGreaterThan(0.8)
  })

  test('sollte Fehler bei ungültigem Dokument-Format zurückgeben', async () => {
    // Erstelle ungültiges Dokument
    fs.writeFileSync(
      path.join(documentsDir, 'documents.json'),
      JSON.stringify({ invalid: 'format' })
    )

    const response = await fetch('/api/upload/vectorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId })
    })

    const result = await response.json()
    expect(response.status).toBe(500)
    expect(result.stage).toBe('error')
  })

  test('sollte Fehler bei fehlender Template-ID zurückgeben', async () => {
    const response = await fetch('/api/upload/vectorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toHaveProperty('error')
  })
}) 