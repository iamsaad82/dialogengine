import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { mkdir } from 'fs/promises'
import { DocumentProcessor } from '@/lib/services/document/DocumentProcessor'
import { JobManager } from '@/lib/services/jobManager'
import { prisma } from '@/lib/db'
import { JobError } from '@/lib/types/jobs'
import { MonitoringService } from '@/lib/monitoring/monitoring'
import { PineconeService } from '@/lib/services/pinecone/PineconeService'
import { ContentVectorizer } from '@/lib/services/vectorizer'
import { OpenAI } from 'openai'
import { Pinecone } from '@pinecone-database/pinecone'

// Erlaubte Dateitypen
const ALLOWED_TYPES = [
  'text/markdown',
  'text/plain',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/xml',
  'text/xml'
]

// Dateierweiterungen zu MIME-Types Mapping
const EXTENSION_MIME_MAP: Record<string, string> = {
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xml': 'application/xml'
}

const jobManager = new JobManager()

export async function POST(request: NextRequest) {
  let jobId: string | undefined
  let pineconeService: PineconeService | undefined
  let vectorizer: ContentVectorizer | undefined
  const startTime = Date.now()
  let lastProgressUpdate = startTime

  const calculateTimeEstimates = (currentProgress: number) => {
    const currentTime = Date.now()
    const elapsedTime = currentTime - startTime
    const timePerPercent = elapsedTime / Math.max(currentProgress, 1) // Verhindere Division durch 0
    const remainingProgress = 100 - currentProgress
    const estimatedTimeRemaining = timePerPercent * remainingProgress
    const processingSpeed = currentProgress / (elapsedTime / 1000)

    // Optimierte Zeitschätzungen
    return {
      estimatedTimeRemaining: Math.round(estimatedTimeRemaining),
      processingSpeed: Math.round(processingSpeed * 100) / 100,
      startTime
    }
  }

  try {
    console.log('[Upload] Starte Datei-Upload-Prozess')
    const formData = await request.formData()
    const file = formData.get('file') as File
    jobId = formData.get('jobId') as string
    const templateId = formData.get('templateId') as string

    console.log(`[Upload] Empfangene Daten:
      - Dateiname: ${file?.name}
      - Job-ID: ${jobId}
      - Template-ID: ${templateId}
    `)

    if (!file || !jobId || !templateId) {
      console.error('[Upload] Fehlende erforderliche Daten')
      return NextResponse.json({
        success: false,
        message: 'Datei, Job-ID und Template-ID sind erforderlich'
      }, { status: 400 })
    }

    // Überprüfe Dateityp anhand der Dateiendung
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    let mimeType = EXTENSION_MIME_MAP[fileExtension] || file.type
    
    // Detailliertes Debugging für XML-Dateien
    console.log(`[Upload] Detaillierte XML-Debugging-Informationen:
      - Dateiname: ${file.name}
      - Dateiendung: ${fileExtension}
      - Original MIME-Type: ${file.type}
      - Gemappter MIME-Type: ${EXTENSION_MIME_MAP[fileExtension]}
      - Resultierender MIME-Type: ${mimeType}
      - Ist XML-Datei: ${fileExtension === '.xml'}
      - Erlaubte Typen: ${ALLOWED_TYPES.join(', ')}
    `)

    // Erweiterte XML-Erkennung
    if (fileExtension === '.xml') {
      console.log('[Upload] XML-Datei erkannt, setze MIME-Type auf application/xml')
      mimeType = 'application/xml'
    } else if (file.type === 'text/xml' || file.type === 'application/xml') {
      console.log('[Upload] XML MIME-Type erkannt')
      mimeType = 'application/xml'
    }

    // Prüfe MIME-Type
    const isAllowedType = ALLOWED_TYPES.includes(mimeType)
    console.log(`[Upload] MIME-Type Überprüfung:
      - Aktueller MIME-Type: ${mimeType}
      - Ist erlaubt: ${isAllowedType}
    `)

    if (!isAllowedType) {
      console.error(`[Upload] Nicht unterstützter Dateityp: ${mimeType}`)
      return NextResponse.json({
        success: false,
        message: `Nicht unterstützter Dateityp. Erlaubte Typen: .md, .txt, .pdf, .doc, .docx, .xml`
      }, { status: 400 })
    }

    // Optimierte Fortschritts-Updates
    const progressSteps = {
      uploading: 10,
      scanning: 25,
      processing: 40,
      analyzing: 70,
      indexing: 85,
      completed: 100
    }

    // Aktualisiere Job-Status mit optimierten Zeitinformationen
    await jobManager.updateJob({
      jobId,
      phase: 'uploading',
      progress: progressSteps.uploading,
      currentFile: file.name,
      details: 'Datei wird hochgeladen',
      ...calculateTimeEstimates(progressSteps.uploading)
    })

    // Initialisiere Monitoring Service
    console.log('[Upload] Initialisiere Monitoring Service')
    const monitoring = new MonitoringService({
      serviceName: 'document-processor',
      serviceVersion: '1.0.0',
      collectDefaultMetrics: false
    })

    // Aktualisiere Job-Status mit optimierten Zeitinformationen
    await jobManager.updateJob({
      jobId,
      phase: 'scanning',
      progress: progressSteps.scanning,
      currentFile: file.name,
      details: 'Dokument wird gescannt',
      ...calculateTimeEstimates(progressSteps.scanning)
    })

    // Initialisiere Document Processor mit Monitoring
    console.log('[Upload] Initialisiere Document Processor')
    const processor = new DocumentProcessor(
      process.env.OPENAI_API_KEY!,
      monitoring
    )
    
    // Aktualisiere Job-Status: Start der Verarbeitung
    console.log('[Upload] Aktualisiere Job-Status: processing')
    await jobManager.updateJob({
      jobId,
      phase: 'processing',
      progress: progressSteps.processing,
      currentFile: file.name,
      details: 'Dokument wird verarbeitet',
      ...calculateTimeEstimates(progressSteps.processing)
    })
    
    // Verarbeite Dokument
    console.log('[Upload] Starte Dokumentverarbeitung')
    const { document, handler } = await processor.processDocument(file, templateId)
    console.log('[Upload] Dokumentverarbeitung abgeschlossen')

    // Initialisiere Pinecone Service
    console.log('[Upload] Initialisiere Pinecone Service')
    const pineconeService = new PineconeService({
      apiKey: process.env.PINECONE_API_KEY!,
      indexName: process.env.PINECONE_INDEX!,
      openAIApiKey: process.env.OPENAI_API_KEY
    })

    // Stelle sicher, dass der Template-Index existiert
    console.log('[Upload] Stelle sicher, dass Template-Index existiert')
    await pineconeService.ensureTemplateIndex(templateId)

    // Aktualisiere Job-Status: Indexierung
    console.log('[Upload] Aktualisiere Job-Status: indexing')
    await jobManager.updateJob({
      jobId,
      phase: 'indexing',
      progress: progressSteps.indexing,
      currentFile: file.name,
      details: 'Dokument wird indexiert',
      ...calculateTimeEstimates(progressSteps.indexing)
    })

    // Erstelle Pinecone Metadaten
    const pineconeMetadata = {
      id: document.metadata.id,
      type: document.metadata.type,
      title: document.metadata.title,
      language: document.metadata.language,
      source: document.metadata.source,
      lastModified: document.metadata.lastModified,
      templateId: document.metadata.templateId,
      content: document.content,
      handler_type: handler.type,
      lastUpdated: new Date().toISOString(),
      // Optimierte Link-Informationen als JSON-Strings
      links_internal: JSON.stringify(document.structuredData.metadata.links?.internal.map(link => ({
        url: link.url,
        title: link.title
      })) || []),
      links_external: JSON.stringify(document.structuredData.metadata.links?.external.map(link => ({
        url: link.url,
        domain: link.domain,
        trust: link.trust
      })) || []),
      links_media: JSON.stringify(document.structuredData.metadata.links?.media.map(media => ({
        url: media.url,
        type: media.type,
        description: media.description
      })) || [])
    }

    // Generiere Embeddings und speichere in Pinecone
    console.log('[Upload] Generiere Embeddings und speichere in Pinecone')
    const embeddings = await pineconeService.generateEmbeddings(document.content)
    const uploadResult = await pineconeService.upsert({
      id: document.metadata.id,
      metadata: pineconeMetadata,
      values: embeddings,
      templateId
    })

    console.log('[Upload] Pinecone Upload Ergebnis:', uploadResult)

    // Warte kurz, um sicherzustellen, dass der Index aktualisiert wurde
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Aktualisiere Job-Status: Abgeschlossen
    console.log('[Upload] Aktualisiere Job-Status: completed')
    await jobManager.updateJob({
      jobId,
      phase: 'completed',
      progress: 100,
      currentFile: file.name,
      details: 'Verarbeitung abgeschlossen'
    })

    // Hole den finalen Job-Status
    const finalJob = await jobManager.getJob(jobId)
    console.log('[Upload] Finaler Job-Status:', finalJob?.status)

    // Hole existierende Handler aus der Datenbank
    console.log('[Upload] Prüfe existierende Handler')
    const existingTemplate = await prisma.template.findUnique({
      where: { id: templateId }
    })
    
    if (!existingTemplate) {
      throw new Error('Template nicht gefunden')
    }

    interface BotConfig {
      handlers: Record<string, any[]>;
      lastUpdated?: string;
      [key: string]: any;
    }

    let existingConfig: BotConfig = {
      handlers: {}
    }
    let existingHandlers = []
    
    try {
      if (existingTemplate.jsonBot) {
        const parsedConfig = JSON.parse(existingTemplate.jsonBot)
        existingConfig = {
          ...parsedConfig,
          handlers: parsedConfig.handlers || {}
        }
        existingHandlers = existingConfig.handlers[templateId] || []
      }
    } catch (e) {
      console.error('Fehler beim Parsen des jsonBot:', e)
    }

    // Prüfe, ob bereits ein Handler für diesen Content-Type existiert
    const existingHandler = existingHandlers.find(
      (h: any) => h.type === handler.type
    )

    if (existingHandler) {
      console.log(`[Upload] Aktualisiere existierenden Handler für Typ: ${handler.type}`)
      // Aktualisiere nur die relevanten Felder
      Object.assign(existingHandler, {
        metadata: handler.metadata,
        responses: handler.responses,
        settings: {
          ...existingHandler.settings,
          ...handler.settings
        }
      })

      // Aktualisiere Template mit dem aktualisierten Handler
      await prisma.template.update({
        where: { id: templateId },
        data: {
          jsonBot: JSON.stringify({
            ...existingConfig,
            handlers: {
              ...existingConfig.handlers,
              [templateId]: existingHandlers
            },
            lastUpdated: new Date().toISOString()
          })
        }
      })
      console.log('[Upload] Handler erfolgreich aktualisiert')
    } else {
      console.log(`[Upload] Erstelle neuen Handler für Typ: ${handler.type}`)
      // Füge neuen Handler hinzu
      await prisma.template.update({
        where: { id: templateId },
        data: {
          jsonBot: JSON.stringify({
            ...existingConfig,
            handlers: {
              ...existingConfig.handlers,
              [templateId]: [...existingHandlers, handler]
            },
            lastUpdated: new Date().toISOString()
          })
        }
      })
      console.log('[Upload] Neuer Handler erfolgreich erstellt')
    }

    // Erstelle Upload-Verzeichnis
    const uploadDir = join(process.cwd(), 'uploads', templateId)
    console.log(`[Upload] Erstelle Upload-Verzeichnis: ${uploadDir}`)
    await mkdir(uploadDir, { recursive: true })

    // Generiere eindeutigen Dateinamen
    const fileName = `${jobId}-${file.name}`
    const filePath = join(uploadDir, fileName)
    console.log(`[Upload] Speichere Datei unter: ${filePath}`)

    // Speichere die Datei
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)
    console.log('[Upload] Datei gespeichert')

    // Initialisiere OpenAI und Pinecone
    console.log('[Upload] Initialisiere Services')
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const pinecone = new Pinecone({ 
      apiKey: process.env.PINECONE_API_KEY!
    })

    // Initialisiere Vectorizer
    console.log('[Upload] Initialisiere Content Vectorizer')
    vectorizer = new ContentVectorizer({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      pineconeApiKey: process.env.PINECONE_API_KEY || '',
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
      pineconeIndex: `dialog-engine-${templateId}`,
      pineconeHost: process.env.PINECONE_HOST || '',
      templateId
    })

    // Nach der Handler-Generierung und vor dem Speichern
    console.log('[Upload] Starte Vektorisierung und Pinecone-Upload')
    await vectorizer.vectorizeContent(document.content, {
      url: `${templateId}/${file.name}`,
      title: document.metadata.title,
      contentType: document.metadata.type,
      templateId,
      language: document.metadata.language,
      lastModified: document.metadata.lastModified,
      content: document.content
    })
    console.log('[Upload] Vektorisierung und Pinecone-Upload abgeschlossen')

    console.log('[Upload] Upload-Prozess erfolgreich abgeschlossen')
    return NextResponse.json({
      success: true,
      jobId,
      status: finalJob?.status
    })

  } catch (error) {
    console.error('[Upload] Fehler beim Datei-Upload:', error)
    
    // Aktualisiere Job-Status bei Fehler
    const jobError: JobError = {
      file: (error as any)?.file || 'unknown',
      message: error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten',
      phase: 'error',
      timestamp: new Date()
    }

    if (jobId) {
      console.log('[Upload] Aktualisiere Job-Status: error')
      await jobManager.updateJob({
        jobId,
        phase: 'error',
        progress: 0,
        error: jobError
      })
    }
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const jobId = searchParams.get('jobId')
    const templateId = searchParams.get('templateId')

    if (!jobId || !templateId) {
      return NextResponse.json({
        success: false,
        message: 'Job-ID und Template-ID sind erforderlich'
      }, { status: 400 })
    }

    // Hole den aktuellen Job-Status
    const status = await jobManager.getJob(jobId)

    return NextResponse.json({
      success: true,
      status
    })

  } catch (error) {
    console.error('Fehler bei der Status-Abfrage:', error)
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten'
    }, { status: 500 })
  }
} 