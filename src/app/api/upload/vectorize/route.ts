import { NextRequest, NextResponse } from 'next/server'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { OpenAI } from 'openai'
import { ContentTypeDetector, DetectionInput } from '@/lib/services/contentTypeDetector'
import { ContentVectorizer } from '@/lib/services/vectorizer'
import { Redis } from 'ioredis'
import { Pinecone, RecordMetadata, PineconeRecord } from '@pinecone-database/pinecone'
import { WebsiteScanner } from '@/lib/services/scanner'
import { headers } from 'next/headers'

// Definiere erweiterte Typen für Pinecone
interface ExtendedQueryOptions {
  vector: number[]
  filter?: Record<string, any>
  topK: number
  includeMetadata: boolean
  namespace?: string
}

interface ExtendedUpsertRequest {
  vectors: {
    id: string
    values: number[]
    metadata?: Record<string, any>
  }[]
  namespace?: string
}

// Definiere die erweiterten Typen für die Pinecone API
interface PineconeMetadata extends RecordMetadata {
  templateId: string
  contentType: string
  title: string
  content: string
  
  // Download-spezifische Metadaten
  fileType?: string
  fileSize?: string
  downloadUrl?: string
  version?: string
  lastModified?: string
  
  // Video-spezifische Metadaten
  duration?: string
  videoUrl?: string
  thumbnail?: string
  transcript?: string
  subtitles?: boolean
  
  // Allgemeine Metadaten
  url?: string
  description?: string
  tags?: string[]
  language?: string
  lastUpdated?: string
  
  // Index-Signatur für RecordMetadata-Kompatibilität
  [key: string]: any
}

interface PineconeVector {
  id: string
  values: number[]
  metadata?: PineconeMetadata
}

interface UpsertRequest {
  vectors: PineconeVector[]
}

// Initialisiere Services
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
  controllerHostUrl: `https://controller.${process.env.PINECONE_ENVIRONMENT}.pinecone.io`
})

const redis = new Redis(process.env.REDIS_URL || '')
const detector = new ContentTypeDetector(openai)
const vectorizer = new ContentVectorizer({
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  pineconeApiKey: process.env.PINECONE_API_KEY || '',
  pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
  pineconeIndex: process.env.PINECONE_INDEX || '',
  pineconeHost: process.env.PINECONE_HOST || ''
})

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

async function processDocument(file: File, templateId: string) {
  try {
    console.log('Starte Dokumentenverarbeitung für:', file.name)
    
    // Prüfe zuerst auf Duplikate
    const duplicateCheck = await checkForDuplicates(file, templateId)
    console.log('Duplikatsprüfung:', duplicateCheck)
    
    if (duplicateCheck.isDuplicate) {
      return {
        success: true,
        isDuplicate: true,
        contentType: duplicateCheck.data.metadata?.contentType,
        confidence: duplicateCheck.data.score || 1.0,
        metadata: duplicateCheck.data.metadata
      }
    }

    // Wenn kein Duplikat, verarbeite normal weiter
    console.log('Lese Dateiinhalt...')
    const rawContent = await file.text()
    console.log('Bereinige Inhalt...')
    const cleanedContent = await cleanContent(rawContent)
    
    // Content-Type Detection mit erweiterten Metadaten
    const detectionResult = await detector.detect({
      text: cleanedContent,
      title: file.name,
      url: file.name
    })
    
    if (!('type' in detectionResult)) {
      throw new Error('Content-Type Detection fehlgeschlagen')
    }

    console.log('Content-Type erkannt:', detectionResult.type)

    try {
      // Erstelle Embedding
      console.log('Erstelle Embedding...')
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: cleanedContent
      })

      // Bereite Metadaten vor
      const record: PineconeRecord<PineconeMetadata> = {
        id: `${templateId}:${file.name}`,
        values: embedding.data[0].embedding,
        metadata: {
          templateId,
          contentType: detectionResult.type,
          title: file.name,
          content: cleanedContent,
          fileType: file.type,
          fileSize: `${Math.round(file.size / 1024)} KB`,
          lastModified: new Date(file.lastModified).toISOString(),
          ...(detectionResult.metadata || {})
        }
      }

      // Speichere in Pinecone
      console.log('Speichere in Pinecone...')
      const index = pinecone.index(process.env.PINECONE_INDEX || '')
      
      if (!process.env.PINECONE_INDEX) {
        throw new Error('PINECONE_INDEX ist nicht konfiguriert')
      }
      
      console.log('Sende Upsert-Request an Pinecone:', {
        indexName: process.env.PINECONE_INDEX,
        vectorCount: 1
      })
      
      await index.upsert([record])
      
      console.log('Pinecone Upsert erfolgreich')
    } catch (vectorizeError) {
      console.error('Detaillierter Vektorisierungsfehler:', {
        error: vectorizeError,
        message: vectorizeError instanceof Error ? vectorizeError.message : 'Unbekannter Fehler',
        stack: vectorizeError instanceof Error ? vectorizeError.stack : undefined
      })
      throw new Error(`Vektorisierungsfehler: ${vectorizeError instanceof Error ? vectorizeError.message : 'Unbekannter Fehler'}`)
    }
    
    // Cache in Redis für schnellen Zugriff
    try {
      console.log('Speichere in Redis-Cache...')
      const contentHash = Buffer.from(rawContent).toString('base64')
      const cacheKey = `doc:${templateId}:${contentHash}`
      await redis.set(cacheKey, JSON.stringify({
        content: cleanedContent,
        contentType: detectionResult.type,
        metadata: detectionResult.metadata,
        processedAt: new Date().toISOString()
      }))
      console.log('Redis-Cache erfolgreich')
    } catch (cacheError) {
      console.error('Redis-Cache Fehler:', cacheError)
      // Ignoriere Cache-Fehler
    }
    
    return {
      success: true,
      isDuplicate: false,
      contentType: detectionResult.type,
      confidence: detectionResult.confidence,
      metadata: detectionResult.metadata
    }
  } catch (error) {
    console.error('Detaillierter Fehler bei der Dokumentenverarbeitung:', {
      error,
      message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      stack: error instanceof Error ? error.stack : undefined
    })
    throw new Error('Fehler bei der Dokumentenverarbeitung: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'))
  }
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  const templateId = formData.get('templateId') as string

  if (!file) {
    return NextResponse.json(
      { error: 'Keine Datei gefunden' },
      { status: 400 }
    )
  }

  if (!templateId) {
    return NextResponse.json(
      { error: 'Keine Template-ID gefunden' },
      { status: 400 }
    )
  }

  // Erstelle einen TransformStream für die Status-Updates
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  const encoder = new TextEncoder()

  const sendStatus = async (status: {
    status: 'uploading' | 'processing' | 'vectorizing' | 'complete' | 'error'
    progress: number
    details: string
  }) => {
    await writer.write(
      encoder.encode(JSON.stringify(status) + '\n')
    )
  }

  try {
    const scanner = new WebsiteScanner({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      pineconeApiKey: process.env.PINECONE_API_KEY || '',
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
      pineconeIndex: process.env.PINECONE_INDEX || '',
      pineconeHost: process.env.PINECONE_HOST,
      templateId
    })

    // Starte die Verarbeitung im Hintergrund
    ;(async () => {
      try {
        // Upload-Phase
        await sendStatus({
          status: 'uploading',
          progress: 25,
          details: 'Datei wird hochgeladen...'
        })

        // Verarbeitungs-Phase
        await sendStatus({
          status: 'processing',
          progress: 50,
          details: 'Datei wird verarbeitet...'
        })

        // Vektorisierungs-Phase
        await sendStatus({
          status: 'vectorizing',
          progress: 75,
          details: 'Dokument wird vektorisiert...'
        })

        // Verarbeite die Datei
        await scanner.processUploadedFile(file)

        // Abschluss
        await sendStatus({
          status: 'complete',
          progress: 100,
          details: 'Dokument erfolgreich verarbeitet'
        })

        await writer.close()
      } catch (error) {
        await sendStatus({
          status: 'error',
          progress: 0,
          details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        })
        await writer.close()
      }
    })()

    return new NextResponse(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    await sendStatus({
      status: 'error',
      progress: 0,
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    })
    await writer.close()

    return NextResponse.json(
      { error: 'Verarbeitung fehlgeschlagen' },
      { status: 500 }
    )
  }
} 