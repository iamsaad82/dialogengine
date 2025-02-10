import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { FirecrawlScanner } from '@/lib/services/firecrawl'
import { SmartSearchHandler } from '@/lib/services/smartSearch'
import { ContentVectorizer } from '@/lib/services/vectorizer'
import { Redis } from 'ioredis'
import { Pinecone } from '@pinecone-database/pinecone'

describe('System Integration Tests', () => {
  let redis: Redis
  let pinecone: Pinecone
  let scanner: FirecrawlScanner
  let smartSearch: SmartSearchHandler
  let vectorizer: ContentVectorizer
  const TEST_URL = process.env.TEST_URL || 'https://www.aok.de/pk/leistungen/'
  const TEST_TEMPLATE_ID = 'cm6voqaz40004yw0aon09wrhq'
  const TEST_TIMEOUT = parseInt(process.env.TEST_TIMEOUT || '300000')
  const TEST_INDEX = 'dialog-engine'

  beforeAll(async () => {
    // Setze Standard-Umgebungsvariablen für Tests
    process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
    process.env.PINECONE_API_KEY = process.env.PINECONE_API_KEY || 'test-key'
    process.env.PINECONE_ENVIRONMENT = 'gcp-europe-west4-de1d'
    process.env.PINECONE_INDEX = TEST_INDEX
    process.env.PINECONE_HOST = `https://${TEST_INDEX}-cwkwcon.svc.gcp-europe-west4-de1d.pinecone.io`
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key'
    process.env.FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || 'test-key'
    process.env.TEST_TEMPLATE_ID = TEST_TEMPLATE_ID
    process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-6vZk_7_vXoHEGQb_NYr5IFwqxJ_4QEYLBVUIm4YxvDgTAXtNQVJnl1MWTYQPRHXSLQNYaw-jFEtlkgGPFQ-RZw-5c5pegAA'

    // Prüfe ob alle notwendigen Umgebungsvariablen gesetzt sind
    const requiredEnvVars = [
      'REDIS_URL',
      'PINECONE_API_KEY',
      'PINECONE_ENVIRONMENT',
      'PINECONE_INDEX',
      'PINECONE_HOST',
      'OPENAI_API_KEY',
      'FIRECRAWL_API_KEY',
      'TEST_TEMPLATE_ID',
      'ANTHROPIC_API_KEY'
    ]

    requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar]) {
        throw new Error(`Umgebungsvariable ${envVar} ist nicht gesetzt`)
      }
      console.log(`${envVar} ist gesetzt:`, process.env[envVar])
    })

    // Initialisiere Services
    redis = new Redis(process.env.REDIS_URL || '', {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          console.error('Redis-Verbindung fehlgeschlagen nach 3 Versuchen')
          return null
        }
        return Math.min(times * 1000, 3000)
      },
      enableOfflineQueue: false
    })

    // Warte auf Redis-Verbindung
    await new Promise<void>((resolve, reject) => {
      redis.on('connect', () => {
        console.log('Redis-Verbindung erfolgreich')
        resolve()
      })
      redis.on('error', (error) => {
        console.error('Redis-Verbindungsfehler:', error)
        reject(error)
      })
      // Timeout nach 10 Sekunden
      setTimeout(() => reject(new Error('Redis-Verbindung Timeout')), 10000)
    })

    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || ''
    })

    scanner = new FirecrawlScanner({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      pineconeApiKey: process.env.PINECONE_API_KEY || '',
      firecrawlApiKey: process.env.FIRECRAWL_API_KEY || '',
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT,
      pineconeIndex: process.env.PINECONE_INDEX,
      pineconeHost: process.env.PINECONE_HOST,
      redisUrl: process.env.REDIS_URL
    })

    smartSearch = new SmartSearchHandler({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      pineconeApiKey: process.env.PINECONE_API_KEY || '',
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
      pineconeIndex: process.env.PINECONE_INDEX || '',
      pineconeHost: process.env.PINECONE_HOST,
      redisUrl: process.env.REDIS_URL,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY?.trim(),
      templateId: TEST_TEMPLATE_ID
    })

    vectorizer = new ContentVectorizer({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      pineconeApiKey: process.env.PINECONE_API_KEY!,
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT!,
      pineconeIndex: process.env.PINECONE_INDEX!,
      templateId: 'test'
    })

    // Prüfe Pinecone-Verbindung
    try {
      const index = pinecone.index(process.env.PINECONE_INDEX || '')
      const stats = await index.describeIndexStats()
      console.log('Pinecone-Verbindung erfolgreich:', stats)
      console.log('Pinecone-Konfiguration:', {
        environment: process.env.PINECONE_ENVIRONMENT,
        index: process.env.PINECONE_INDEX,
        host: process.env.PINECONE_HOST
      })
      // Stelle sicher, dass der Index Daten enthält
      expect(stats.totalRecordCount).toBeGreaterThan(0)
    } catch (error) {
      console.error('Pinecone-Verbindungsfehler:', error)
      throw error
    }
  })

  afterAll(async () => {
    // Cleanup
    console.log('Beende Tests...')
    if (redis) {
      console.log('Schließe Redis-Verbindung...')
      await redis.quit()
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    console.log('Tests beendet')
  })

  test('ContentVectorizer: Batch-Verarbeitung und Fortschrittsüberwachung', async () => {
    const testDocs = [
      {
        url: 'https://test.de/doc1',
        title: 'Leistungen für Schwangerschaft & Geburt',
        content: 'Die AOK bietet umfassende Vorsorge und Betreuung während der Schwangerschaft. ' +
                'Dazu gehören regelmäßige Vorsorgeuntersuchungen, Hebammenbetreuung und Geburtsvorbereitungskurse. ' +
                'Weitere Informationen finden Sie in Ihrer AOK-Geschäftsstelle.',
        metadata: {
          templateId: TEST_TEMPLATE_ID,
          contentType: 'info',
          language: 'de'
        }
      },
      {
        url: 'https://test.de/doc2',
        title: 'Familienversicherung der AOK',
        content: 'Die Familienversicherung der AOK ermöglicht eine kostenfreie Mitversicherung von Kindern, ' +
                'Ehe- oder eingetragenen Lebenspartnern. Der monatliche Beitrag ist dabei bereits in der ' +
                'Versicherung des Hauptversicherten enthalten.',
        metadata: {
          templateId: TEST_TEMPLATE_ID,
          contentType: 'service',
          language: 'de'
        }
      }
    ]

    const progressUpdates: any[] = []
    await vectorizer.indexContent(testDocs, (progress) => {
      progressUpdates.push(progress)
    })

    expect(progressUpdates.length).toBeGreaterThan(0)
    expect(progressUpdates[progressUpdates.length - 1].status).toBe('completed')
    expect(progressUpdates[progressUpdates.length - 1].processedVectors).toBe(testDocs.length)
  }, 30000)

  test('ContentVectorizer: Metadaten-Validierung und Suche', async () => {
    const query = 'Familienversicherung'
    const results = await vectorizer.searchSimilar(query, 2, {
      templateId: TEST_TEMPLATE_ID
    })

    expect(results.length).toBeLessThanOrEqual(2)
    results.forEach(result => {
      expect(result.metadata).toHaveProperty('url')
      expect(result.metadata).toHaveProperty('title')
      expect(result.metadata).toHaveProperty('contentType')
      expect(result.metadata).toHaveProperty('templateId', TEST_TEMPLATE_ID)
    })
  }, 10000)

  test('Vollständiger E2E-Test: Crawling, Indexierung und Dialog', async () => {
    const TEMPLATE_ID = 'cm6voqaz40004yw0aon09wrhq'
    console.log('Verwende vorhandene Markdown-Dateien aus data/scans/' + TEMPLATE_ID)

    // Lese die Markdown-Dateien für Schwangerschaft und Familienversicherung
    const testDocs = [
      {
        url: 'https://www.aok.de/pk/leistungen/schwangerschaft-geburt/',
        title: 'Schwangerschaft und Geburt',
        content: `Die AOK bietet umfassende Vorsorge und Betreuung während der Schwangerschaft. 
                Dazu gehören regelmäßige Vorsorgeuntersuchungen, Hebammenbetreuung und Geburtsvorbereitungskurse.
                Wir unterstützen Sie in allen Phasen - von der Familienplanung bis zur Geburt.
                Mit der AOK-App "Schwanger" begleiten wir Sie durch die Schwangerschaft.`,
        metadata: {
          templateId: TEMPLATE_ID,
          contentType: 'info',
          language: 'de',
          lastModified: new Date().toISOString()
        }
      },
      {
        url: 'https://www.aok.de/pk/leistungen/familienversicherung/',
        title: 'Familienversicherung der AOK',
        content: `Die Familienversicherung der AOK ermöglicht eine kostenfreie Mitversicherung von Kindern,
                Ehe- oder eingetragenen Lebenspartnern. Der monatliche Beitrag ist dabei bereits in der
                Versicherung des Hauptversicherten enthalten. Die Familienversicherung ist eine der wichtigsten
                Säulen der gesetzlichen Krankenversicherung.`,
        metadata: {
          templateId: TEMPLATE_ID,
          contentType: 'service',
          language: 'de',
          lastModified: new Date().toISOString()
        }
      }
    ]

    // Indexiere die Dokumente
    console.log('Indexiere Testdokumente...')
    await vectorizer.indexContent(testDocs, (progress) => {
      console.log('Indexierungs-Fortschritt:', progress)
    })

    // Warte kurz, damit die Indexierung abgeschlossen werden kann
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Prüfe Indexierung
    const index = pinecone.index(process.env.PINECONE_INDEX || '')
    const stats = await index.describeIndexStats()
    console.log('Pinecone Index Statistiken:', stats)
    expect(stats.totalRecordCount).toBeGreaterThan(0)

    // Teste den Dialog-Modus mit verschiedenen Fragen
    const testQueries = [
      {
        query: 'Was sind die Leistungen während der Schwangerschaft?',
        expectedKeywords: ['vorsorge', 'hebamme', 'betreuung', 'schwangerschaft']
      },
      {
        query: 'Wie funktioniert die Familienversicherung?',
        expectedKeywords: ['kostenlos', 'kinder', 'partner', 'mitversicherung']
      }
    ]

    // Führe die Testfragen nacheinander aus
    for (const { query, expectedKeywords } of testQueries) {
      console.log('\nTeste Frage:', query)
      const response = await smartSearch.handleQuery(query)
      
      expect(response).toBeDefined()
      expect(response.text).toBeDefined()
      expect(response.sources.length).toBeGreaterThan(0)

      // Prüfe ob die erwarteten Keywords in der Antwort vorkommen
      const responseText = response.text.toLowerCase()
      expectedKeywords.forEach(keyword => {
        expect(responseText).toContain(keyword.toLowerCase())
      })

      console.log('Antwort:', response.text.substring(0, 100) + '...')
      console.log('Quellen:', response.sources.length)
      
      // Warte kurz zwischen den Anfragen
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }, TEST_TIMEOUT)

  test('SmartSearchHandler: Suche und Antwortgenerierung', async () => {
    const query = 'Wie funktioniert die Familienversicherung?'
    
    // Warte auf die Indexierung
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    console.log('Starte Suche mit:', {
      query,
      templateId: TEST_TEMPLATE_ID,
      pineconeIndex: process.env.PINECONE_INDEX
    })
    
    const response = await smartSearch.handleQuery(query)
    
    console.log('\nAntwort:')
    console.log(response.text)

    // Prüfen ob Quellen vorhanden sind
    if (!response.sources || response.sources.length === 0) {
      console.error('Keine Quellen gefunden für die Anfrage:', query)
      console.error('Template ID:', TEST_TEMPLATE_ID)
      console.error('Vollständige Antwort:', JSON.stringify(response, null, 2))
      console.error('Pinecone-Konfiguration:', {
        environment: process.env.PINECONE_ENVIRONMENT,
        index: process.env.PINECONE_INDEX,
        host: process.env.PINECONE_HOST
      })
    }

    expect(response).toBeDefined()
    expect(response.text).toBeDefined()
    expect(response.sources.length).toBeGreaterThan(0)
    
    // Prüfe die Antwortqualität
    const responseText = response.text.toLowerCase()
    const expectedKeywords = ['familienversicherung', 'kostenlos', 'kinder', 'partner', 'mitversicherung']
    expectedKeywords.forEach(keyword => {
      expect(responseText).toContain(keyword.toLowerCase())
    })
  }, TEST_TIMEOUT)
}) 