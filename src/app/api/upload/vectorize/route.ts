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
import { ContentTypeEnum } from '@/lib/types/contentTypes'
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

    const index = pinecone.index(process.env.PINECONE_INDEX || '')
    
    // @ts-ignore - namespace ist in der aktuellen API verfügbar
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

    if (!detectionResult || detectionResult.type === ContentTypeEnum.DEFAULT) {
      throw new Error('Content-Type Detection fehlgeschlagen')
    }

    const metadata: DocumentMetadata = {
      id: `${templateId}:${file.name}`,
      type: detectionResult.type,
      title: file.name,
      language: 'de',
      source: file.name,
      lastModified: new Date().toISOString(),
      templateId,
      templateMetadata: {}
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
  
  try {
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

    // Initialisiere Services
    const indexName = `dialog-engine-${templateId}`
    const pineconeService = new PineconeService()

    // Warte auf Index-Bereitschaft
    console.log('[Upload] Stelle Index-Bereitschaft sicher...')
    await waitForIndexReadiness(pineconeService, indexName)
    console.log('[Upload] Index ist bereit, fahre fort mit Upload...')

    // Verarbeite das Dokument
    const processedDoc = await processDocument(file, templateId)

    // Aktualisiere Job-Status
    await jobManager.updateJob({
      jobId,
      phase: 'completed',
      progress: 100
    })

    return NextResponse.json({ 
      success: true,
      type: processedDoc.metadata.type,
      title: processedDoc.metadata.title,
      language: processedDoc.metadata.language
    })

  } catch (error) {
    console.error('[Upload] Fehler beim Datei-Upload:', error)
    
    // Aktualisiere Job-Status bei Fehler
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
              message: error instanceof Error ? error.message : 'Unbekannter Fehler',
              phase: 'error',
              timestamp: new Date()
            }
          })
        }
      }
    } catch (jobError) {
      console.error('[Upload] Fehler beim Aktualisieren des Job-Status:', jobError)
    }

    return NextResponse.json(
      { error: 'Fehler beim Verarbeiten der Datei' },
      { status: 500 }
    )
  }
} 