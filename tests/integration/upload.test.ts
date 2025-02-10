import { describe, expect, test, jest, beforeAll, afterAll } from '@jest/globals'
import { RedisClient } from '../../src/lib/redis'
import { ScanStatus } from '../../src/types'
import { ContentType } from '../../src/lib/types/contentTypes'
import { OpenAI } from 'openai'
import path from 'path'
import fs from 'fs'

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

describe('Upload und Vektorisierung', () => {
  let client: RedisClient
  const fixturesDir = path.join(__dirname, '../fixtures')
  const templateId = 'test-template-123'
  const documentsDir = path.join(process.cwd(), 'data', 'scans', templateId)

  beforeAll(async () => {
    // Stelle sicher, dass die Verzeichnisse existieren
    [fixturesDir, documentsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    })

    client = new RedisClient()
    await client.connect()
  })

  afterAll(async () => {
    // Cleanup
    [fixturesDir, documentsDir].forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true })
      }
    })

    await client.disconnect()
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
    const infoType = detectedTypes.find((t: any) => t.type === ContentType.INFO)
    const contactType = detectedTypes.find((t: any) => t.type === ContentType.CONTACT)
    const downloadType = detectedTypes.find((t: any) => t.type === ContentType.DOWNLOAD)
    
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