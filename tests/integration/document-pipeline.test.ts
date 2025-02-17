import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { DocumentProcessor } from '../../src/lib/services/document/DocumentProcessor'
import { MonitoringService } from '../../src/lib/monitoring/monitoring'
import { PineconeService } from '@/lib/services/pineconeService'
import { HandlerFeedback } from '../../src/lib/services/document/HandlerFeedback'
import { Pinecone } from '@pinecone-database/pinecone'
import * as fs from 'fs'
import * as path from 'path'
import { ContentTypeDetector } from '@/lib/services/contentTypeDetector'
import { JobManager } from '@/lib/services/jobManager'
import { ContentTypeEnum } from '@/lib/types/contentTypes'
import { ProcessedDocument } from '@/lib/services/document/types'
import { OpenAI } from 'openai'
import { PineconeMedicalMetadata, MedicalMetadata } from '@/lib/types/pinecone'
import { RecordMetadata } from '@pinecone-database/pinecone'

describe('Dokument-Verarbeitungs-Pipeline', () => {
  let documentProcessor: DocumentProcessor
  let monitoring: MonitoringService
  let pineconeService: PineconeService
  let handlerFeedback: HandlerFeedback
  let pineconeClient: Pinecone
  const templateId = 'cm72ipkji0024yw3efqierqn2'
  let openai: OpenAI
  let detector: ContentTypeDetector
  let jobManager: JobManager
  const testIndexName = 'dialog-engine-test'

  beforeAll(async () => {
    // Hole Umgebungsvariablen direkt aus process.env
    const openAIApiKey = process.env.OPENAI_API_KEY
    const pineconeApiKey = process.env.PINECONE_API_KEY
    const pineconeIndex = process.env.PINECONE_INDEX
    const redisUrl = process.env.REDIS_URL

    console.log('Umgebungsvariablen:', {
      openAIApiKey: !!openAIApiKey,
      pineconeApiKey: !!pineconeApiKey,
      pineconeIndex,
      redisUrl
    })

    if (!openAIApiKey || !pineconeApiKey || !pineconeIndex || !redisUrl) {
      throw new Error('Erforderliche Umgebungsvariablen fehlen')
    }

    // Monitoring Service initialisieren
    monitoring = new MonitoringService({
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      collectDefaultMetrics: false
    })

    // Handler Feedback initialisieren
    handlerFeedback = new HandlerFeedback(monitoring)

    // Document Processor initialisieren
    documentProcessor = new DocumentProcessor(
      openAIApiKey,
      monitoring
    )

    // Pinecone Client initialisieren
    pineconeClient = new Pinecone({
      apiKey: pineconeApiKey
    })

    // Pinecone Service initialisieren
    pineconeService = new PineconeService()

    // Services initialisieren
    openai = new OpenAI({ apiKey: openAIApiKey })
    detector = new ContentTypeDetector(openai)
    jobManager = new JobManager(redisUrl)

    // Stelle sicher, dass der Test-Index existiert
    await pineconeService.ensureIndexExists(testIndexName)
  })

  test('Verarbeitet ein Testdokument erfolgreich', async () => {
    // Test-Datei erstellen
    const testContent = `
      # Informationen zur Grippeimpfung

      Die jährliche Grippeimpfung ist eine wichtige vorbeugende Maßnahme, besonders für:
      
      - Personen über 60 Jahre
      - Menschen mit chronischen Erkrankungen
      - Schwangere
      - Medizinisches Personal
      
      ## Impfzeitpunkt
      Die beste Zeit für die Grippeimpfung ist zwischen Oktober und November.
      
      ## Nebenwirkungen
      Mögliche Nebenwirkungen sind:
      - Leichte Schmerzen an der Einstichstelle
      - Leichtes Fieber
      - Müdigkeit für 1-2 Tage
      
      ## Kontakt
      Für eine Terminvereinbarung:
      1. Per E-Mail an impfung@praxis.de
      2. Telefonisch unter +49 123 456789
    `

    const testFile = new File([testContent], 'test-document.md', {
      type: 'text/markdown'
    })

    // 1. Job erstellen
    const job = await jobManager.createJob('test-template', [testFile.name])
    expect(job.id).toBeDefined()
    expect(job.status.phase).toBe('queued')

    // 2. Content-Type Detection
    const detectionResult = await detector.detectWithAI({
      text: testContent,
      title: testFile.name,
      url: 'test-url'
    })
    
    expect(detectionResult.type).toBe(ContentTypeEnum.MEDICAL)
    expect(detectionResult.confidence).toBeGreaterThan(0.7)

    // 3. Pinecone Index testen
    const indexExists = await pineconeService.ensureIndexExists(testIndexName)
    expect(indexExists).toBe(true)

    // 4. Embedding erstellen und speichern
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: testContent
    })

    const medicalMetadata: MedicalMetadata = {
      specialty: 'Allgemeinmedizin',
      condition: 'Grippe',
      treatment: 'Impfung',
      urgency: 'low',
      recommendations: [
        'Impfung zwischen Oktober und November',
        'Besonders wichtig für Risikogruppen'
      ]
    }

    const metadata: PineconeMedicalMetadata = {
      type: 'medical',
      title: testFile.name,
      description: 'Informationen zur Grippeimpfung',
      lastUpdated: new Date().toISOString(),
      version: '1.0',
      language: 'de',
      status: 'active',
      templateId: 'test-template',
      contentId: `test:${testFile.name}`,
      source: 'test',
      tags: ['impfung', 'grippe', 'vorsorge'],
      medical: JSON.stringify(medicalMetadata)
    }

    const upsertResult = await pineconeService.upsertVectors(testIndexName, [{
      id: metadata.contentId,
      values: embedding.data[0].embedding,
      metadata
    }])

    expect(upsertResult).toBe(true)

    // 5. Job-Status aktualisieren
    await jobManager.updateJob({
      jobId: job.id,
      phase: 'completed',
      progress: 100
    })

    const updatedJob = await jobManager.getJob(job.id)
    expect(updatedJob?.status.phase).toBe('completed')
    expect(updatedJob?.status.progress).toBe(100)
  }, 30000) // Längeres Timeout für API-Aufrufe

  test('Erkennt Duplikate', async () => {
    const testContent = 'Test Duplikat Dokument'
    const testFile = new File([testContent], 'duplicate.txt', {
      type: 'text/plain'
    })

    // Ersten Upload simulieren
    const job1 = await jobManager.createJob('test-template', [testFile.name])
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: testContent
    })

    const medicalMetadata: MedicalMetadata = {
      specialty: 'Test',
      urgency: 'low'
    }

    const metadata: PineconeMedicalMetadata = {
      type: 'medical',
      title: testFile.name,
      description: 'Test Dokument',
      lastUpdated: new Date().toISOString(),
      version: '1.0',
      language: 'de',
      status: 'active',
      templateId: 'test-template',
      contentId: `test:${testFile.name}`,
      source: 'test',
      tags: ['test'],
      medical: JSON.stringify(medicalMetadata)
    }

    await pineconeService.upsertVectors(testIndexName, [{
      id: metadata.contentId,
      values: embedding.data[0].embedding,
      metadata
    }])

    // Zweiten Upload simulieren
    const job2 = await jobManager.createJob('test-template', [testFile.name])
    
    // Query ausführen
    const results = await pineconeService.query(testIndexName, embedding.data[0].embedding)

    expect(results).toBeDefined()
    expect(results.length).toBeGreaterThan(0)
    if (results[0]) {
      expect(results[0].score).toBeGreaterThan(0.95)
    }
  }, 30000)

  afterAll(async () => {
    // Aufräumen nach den Tests
    try {
      await pineconeService.deleteIndex(testIndexName)
    } catch (error) {
      console.warn('Fehler beim Aufräumen des Test-Index:', error)
    }
  })
}) 