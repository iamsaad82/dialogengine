import { NextRequest, NextResponse } from 'next/server'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { OpenAI } from 'openai'
import { ContentTypeDetector } from '@/lib/services/contentTypeDetector'
import { Redis } from 'ioredis'
import { WebsiteScanner } from '@/lib/services/scanner'
import { headers } from 'next/headers'
import { PineconeService } from '@/lib/services/pineconeService'
import { JobManager } from '@/lib/services/jobManager'
import { ContentTypeEnum, isValidContentType } from '@/lib/types/contentTypes'
import type { ContentType as DocumentContentType } from '@/lib/types/contentTypes'
import { ProcessedDocument, DocumentMetadata } from '@/lib/services/document/types'

// Initialisiere Services
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const redis = new Redis(process.env.REDIS_URL || '')
const detector = new ContentTypeDetector(openai)

const jobManager = new JobManager()

async function cleanContent(content: string): Promise<string> {
  const chunks = []
  const chunkSize = 4000
  
  for (let i = 0; i < content.length; i += chunkSize) {
    const chunk = content.slice(i, i + chunkSize)
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Du bist ein Experte für Textbereinigung. Entferne HTML-Tags, überflüssige Whitespaces und formatiere den Text sauber."
        },
        {
          role: "user",
          content: `Bereinige diesen Text: ${chunk}`
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    })
    
    chunks.push(completion.choices[0].message.content || chunk)
  }
  
  return chunks.join('\n\n')
}

async function checkForDuplicates(file: File, templateId: string) {
  try {
    const fileContent = await file.text()
    const contentHash = Buffer.from(fileContent).toString('base64')
    
    // 1. Prüfe Redis Cache
    const cacheKey = `doc:${templateId}:${contentHash}`
    const cachedDoc = await redis.get(cacheKey)
    if (cachedDoc) {
      return { isDuplicate: true, data: JSON.parse(cachedDoc) }
    }

    // 2. Prüfe Pinecone für ähnliche Dokumente
    const embedding = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: fileContent.slice(0, 1000) // Nur die ersten 1000 Zeichen
    })

    const pineconeService = new PineconeService()
    const pinecone = pineconeService.getPinecone()
    const index = pinecone.index(process.env.PINECONE_INDEX || '')
    
    const queryResponse = await index.query({
      vector: embedding.data[0].embedding,
      filter: { templateId },
      topK: 1,
      includeMetadata: true
    })

    // Prüfe die Ähnlichkeit
    const bestMatch = queryResponse.matches?.[0]
    if (bestMatch && bestMatch.score && bestMatch.score >= 0.95) {
      return { isDuplicate: true, data: bestMatch }
    }

    return { isDuplicate: false }
  } catch (error) {
    console.error('Fehler bei der Duplikatsprüfung:', error)
    return { isDuplicate: false }
  }
}

async function processDocument(file: File, templateId: string): Promise<ProcessedDocument> {
  try {
    console.log('Starte Dokumentenverarbeitung für:', file.name)
    
    const cleanedContent = await cleanContent(await file.text())
    
    // Content-Type Detection mit erweiterten Metadaten
    const detectionResult = await detector.detectWithAI({
      text: cleanedContent,
      title: file.name,
      url: file.name
    })

    if (!detectionResult || !isValidContentType(detectionResult.type)) {
      throw new Error('Content-Type Detection fehlgeschlagen')
    }

    const metadata: DocumentMetadata = {
      id: `${templateId}:${file.name}`,
      type: detectionResult.type as DocumentContentType,
      title: file.name,
      language: 'de',
      source: file.name,
      lastModified: new Date().toISOString(),
      templateId,
      templateMetadata: {},
      actions: [],
      hasImages: false,
      contactPoints: []
    }

    return {
      content: cleanedContent,
      metadata,
      structuredData: {
        sections: [],
        metadata: {}
      }
    }
  } catch (error) {
    console.error('Fehler bei der Dokumentenverarbeitung:', error)
    throw error
  }
}

// Hilfsfunktion zum Extrahieren der templateId aus der URL
function getTemplateIdFromUrl(url: string): string {
  const matches = url.match(/\/templates\/([^\/]+)\//)
  return matches?.[1] || ''
}

type ContentType = {
  type: string
  metadata: {
    keyTopics?: string[]
    entities?: string[]
    facts?: string[]
  }
  confidence?: number
}

// Funktion zum Warten auf Index-Bereitschaft
async function waitForIndexReadiness(pineconeService: PineconeService, indexName: string, maxAttempts: number = 30): Promise<boolean> {
  console.log(`[Pinecone] Warte auf Index-Bereitschaft: ${indexName}`)
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await pineconeService.ensureIndexExists(indexName)
      console.log(`[Pinecone] Index ${indexName} ist bereit (Versuch ${attempt})`)
      return true
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error(`[Pinecone] Index ${indexName} nicht bereit nach ${maxAttempts} Versuchen`)
        throw error
      }
      console.log(`[Pinecone] Warte auf Index... (Versuch ${attempt}/${maxAttempts})`)
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }
  return false
}

export async function POST(req: Request) {
  let formData: FormData | null = null
  const startTime = Date.now()
  
  try {
    // Setze Timeout für Render
    if (startTime + 50000 < Date.now()) {
      throw new Error('Zeitüberschreitung bei der Verarbeitung')
    }

    formData = await req.formData()
    const file = formData.get('file') as File
    const templateId = formData.get('templateId') as string
    const jobId = formData.get('jobId') as string

    if (!file || !templateId || !jobId) {
      return NextResponse.json(
        { error: 'Datei, Template-ID und Job-ID sind erforderlich' },
        { status: 400 }
      )
    }

    // Prüfe Dateigröße (Render-Limit: 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Datei ist zu groß (Maximum: 5MB)' },
        { status: 413 }
      )
    }

    // Aktualisiere Job-Status auf "processing"
    await jobManager.updateJob({
      jobId,
      phase: 'processing',
      progress: 10,
      message: 'Starte Verarbeitung...'
    })

    // Initialisiere Services mit Retry-Logik
    const indexName = `dialog-engine-${templateId}`
    const pineconeService = new PineconeService()
    
    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
      try {
        console.log(`[Upload] Verbindungsversuch ${retryCount + 1}/${maxRetries}`)
        await waitForIndexReadiness(pineconeService, indexName, 10)
        break
      } catch (error) {
        retryCount++
        if (retryCount === maxRetries) throw error
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // Verarbeite das Dokument mit Fortschritts-Updates
    await jobManager.updateJob({
      jobId,
      phase: 'processing',
      progress: 30,
      message: 'Verarbeite Dokument...'
    })

    const processedDoc = await processDocument(file, templateId)

    await jobManager.updateJob({
      jobId,
      phase: 'processing',
      progress: 70,
      message: 'Dokument verarbeitet, speichere...'
    })

    // Erfolgreicher Upload
    await jobManager.updateJob({
      jobId,
      phase: 'completed',
      progress: 100,
      message: 'Upload erfolgreich abgeschlossen'
    })

    return NextResponse.json({ 
      success: true,
      type: processedDoc.metadata.type,
      title: processedDoc.metadata.title,
      language: processedDoc.metadata.language
    })

  } catch (error) {
    console.error('[Upload] Fehler beim Datei-Upload:', error)
    
    // Detaillierte Fehlerbehandlung
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unbekannter Fehler bei der Verarbeitung'

    try {
      if (formData) {
        const jobId = formData.get('jobId') as string
        if (jobId) {
          await jobManager.updateJob({
            jobId,
            phase: 'error',
            progress: 0,
            error: {
              file: 'unknown',
              message: errorMessage,
              phase: 'error',
              timestamp: new Date()
            }
          })
        }
      }
    } catch (jobError) {
      console.error('[Upload] Fehler beim Aktualisieren des Job-Status:', jobError)
    }

    // Sende spezifische Fehlermeldung zurück
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
} 