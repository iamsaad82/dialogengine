import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { ContentVectorizer } from '@/lib/services/vectorizer'
import { ContentDetector } from '@/lib/services/detector'
import { OpenAIService } from '@/lib/services/ai/openai'
import { ContentTypeRegistry, ContentTypeDefinition, BaseContentTypes } from '@/lib/types/contentTypes'
import { parseStringPromise } from 'xml2js'

// Initialisiere Registry
const registry: ContentTypeRegistry = {
  register: async (definition: ContentTypeDefinition): Promise<void> => {
    // Implementierung hier
  },
  get: async (id: string): Promise<ContentTypeDefinition | undefined> => {
    // Implementierung hier
    return undefined;
  },
  list: async (): Promise<ContentTypeDefinition[]> => {
    // Implementierung hier
    return [];
  },
  update: async (id: string, definition: Partial<ContentTypeDefinition>): Promise<void> => {
    // Implementierung hier
  },
  remove: async (id: string): Promise<void> => {
    // Implementierung hier
  },
  validateContent: async (content: string, typeId: string): Promise<boolean> => {
    // Implementierung hier
    return false;
  }
}

// Initialisiere Services
const openai = new OpenAIService({ 
  apiKey: process.env.OPENAI_API_KEY || '',
  registry
})
const detector = new ContentDetector(openai)
const vectorizer = new ContentVectorizer({
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  pineconeApiKey: process.env.PINECONE_API_KEY || '',
  pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
  pineconeIndex: process.env.PINECONE_INDEX || '',
  templateId: ''  // Wird pro Request gesetzt
})

interface VectorResult {
  vectors: Array<{
    id: string;
    values: number[];
    metadata: Record<string, any>;
  }>;
  metadata?: {
    count: number;
    timestamp: string;
    templateId: string;
  };
}

export async function POST(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'Keine Dateien gefunden' },
        { status: 400 }
      )
    }

    // Erstelle einen Job für den Upload
    const jobId = nanoid()
    const uploadJob = await prisma.uploadJob.create({
      data: {
        id: jobId,
        templateId: params.templateId,
        status: 'uploading',
        totalFiles: files.length,
        processedFiles: 0,
        metadata: {
          fileNames: files.map(f => f.name),
          sizes: files.map(f => f.size),
          types: files.map(f => f.type)
        }
      }
    })

    // Starte den Upload-Prozess asynchron
    processUpload(jobId, files, params.templateId)

    return NextResponse.json({ jobId })
  } catch (error) {
    console.error('Fehler beim Upload:', error)
    return NextResponse.json(
      { error: 'Fehler beim Upload' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID fehlt' },
        { status: 400 }
      )
    }

    const job = await prisma.uploadJob.findUnique({
      where: { id: jobId }
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job nicht gefunden' },
        { status: 404 }
      )
    }

    // Berechne den Fortschritt
    const progress = (job.processedFiles / job.totalFiles) * 100

    return NextResponse.json({
      stage: job.status,
      progress,
      message: getStatusMessage(job.status),
      details: job.metadata
    })
  } catch (error) {
    console.error('Fehler beim Status-Check:', error)
    return NextResponse.json(
      { error: 'Fehler beim Status-Check' },
      { status: 500 }
    )
  }
}

async function extractContent(file: File): Promise<string> {
  const content = await file.text()
  
  if (file.name.endsWith('.xml')) {
    try {
      // Parse XML zu JSON
      const result = await parseStringPromise(content, {
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true
      })
      
      // Extrahiere Text aus XML-Struktur
      const extractedText = extractTextFromXML(result)
      console.log('Extrahierter Text aus XML:', extractedText.substring(0, 100) + '...')
      return extractedText
    } catch (error) {
      console.error('Fehler beim XML-Parsing:', error)
      throw new Error('Ungültiges XML-Format')
    }
  }
  
  return content
}

function extractTextFromXML(obj: any): string {
  if (typeof obj === 'string') return obj
  if (Array.isArray(obj)) return obj.map(item => extractTextFromXML(item)).join(' ')
  if (typeof obj === 'object') {
    return Object.values(obj)
      .map(value => extractTextFromXML(value))
      .join(' ')
  }
  return ''
}

async function processUpload(jobId: string, files: File[], templateId: string) {
  const startTime = new Date().toISOString()
  let totalVectorCount = 0

  try {
    console.log(`[Upload ${jobId}] Starte Upload-Verarbeitung für Template ${templateId}`)
    console.log(`[Upload ${jobId}] Anzahl Dateien: ${files.length}`)

    // Aktualisiere den Job-Status mit erweiterten Metadaten
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: 'processing',
        totalFiles: files.length,
        processedFiles: 0,
        metadata: {
          startTime: startTime,
          totalFiles: files.length,
          currentOperation: 'Initialisiere Verarbeitung',
          processingDetails: {
            stage: 'start',
            message: 'Starte Verarbeitung',
            estimatedTimeRemaining: `${files.length * 2} Minuten` // Schätzung: 2 Minuten pro Datei
          }
        }
      }
    })

    // Warte kurz, um die Initialisierung zu simulieren
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Initialisiere Services
    console.log(`[Upload ${jobId}] Initialisiere Services...`)
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        metadata: {
          currentOperation: 'Initialisiere KI-Services',
          processingDetails: {
            stage: 'init',
            message: 'Initialisiere KI-Services und Vektorisierung',
            step: 1,
            totalSteps: 4
          }
        }
      }
    })

    // Warte auf Service-Initialisierung
    await new Promise(resolve => setTimeout(resolve, 3000))

    const openai = new OpenAIService({ apiKey: process.env.OPENAI_API_KEY || '', registry })
    const detector = new ContentDetector(openai)
    const vectorizer = new ContentVectorizer({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      pineconeApiKey: process.env.PINECONE_API_KEY || '',
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
      pineconeIndex: process.env.PINECONE_INDEX || '',
      templateId
    })

    // Verarbeite jede Datei
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      console.log(`[Upload ${jobId}] Verarbeite Datei ${i + 1}/${files.length}: ${file.name}`)

      try {
        // Erstelle Upload-Verzeichnis
        const uploadDir = join(process.cwd(), 'uploads', templateId)
        await mkdir(uploadDir, { recursive: true })
        
        // Speichere Datei
        console.log(`[Upload ${jobId}] Speichere Datei ${file.name}...`)
        await prisma.uploadJob.update({
          where: { id: jobId },
          data: {
            metadata: {
              currentOperation: `Speichere Datei ${file.name}`,
              currentFile: file.name,
              processingDetails: {
                stage: 'save',
                message: `Speichere Datei ${i + 1} von ${files.length}`,
                step: 2,
                totalSteps: 4,
                estimatedTimeRemaining: `${(files.length - i) * 2} Minuten`
              }
            }
          }
        })

        const buffer = await file.arrayBuffer()
        const filePath = join(uploadDir, file.name)
        await writeFile(filePath, Buffer.from(buffer))

        // Simuliere Dateispeicherung
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Extrahiere Text mit XML-Unterstützung
        console.log(`[Upload ${jobId}] Extrahiere Text aus ${file.name}...`)
        await prisma.uploadJob.update({
          where: { id: jobId },
          data: {
            metadata: {
              currentOperation: `Extrahiere Text aus ${file.name}`,
              processingDetails: {
                stage: 'extract',
                message: file.name.endsWith('.xml') ? 
                  'Extrahiere und analysiere XML-Struktur' : 
                  'Extrahiere und analysiere Text',
                step: 3,
                totalSteps: 4
              }
            }
          }
        })

        const content = await extractContent(file)

        // Simuliere Textextraktion und -analyse
        await new Promise(resolve => setTimeout(resolve, 5000))

        // Analysiere Content-Type
        console.log(`[Upload ${jobId}] Analysiere Content-Type für ${file.name}...`)
        await prisma.uploadJob.update({
          where: { id: jobId },
          data: {
            metadata: {
              currentOperation: `Analysiere Dokumenttyp von ${file.name}`,
              processingDetails: {
                stage: 'analyze',
                message: 'Analysiere Dokumenttyp mit KI',
                step: 3,
                totalSteps: 4
              }
            }
          }
        })

        // Simuliere tiefgehende KI-Analyse
        await new Promise(resolve => setTimeout(resolve, 8000))
        
        const contentType = await detector.detect(content)
        console.log(`[Upload ${jobId}] Erkannter Content-Type:`, contentType)

        // Suche nach ähnlichen existierenden Handlern
        console.log(`[Upload ${jobId}] Suche nach ähnlichen Handlern...`)
        const existingHandlers = await prisma.template_handlers.findMany({
          where: { 
            templateId,
            OR: [
              { type: contentType.type },
              {
                metadata: {
                  path: ['suggestedMetadata', 'domain'],
                  equals: contentType.metadata.domain
                }
              }
            ]
          }
        })

        // Analysiere Ähnlichkeit basierend auf Metadaten und Content-Type
        const similarHandler = existingHandlers.find(handler => {
          try {
            const handlerMeta = JSON.parse(handler.metadata || '{}')
            const handlerConfig = JSON.parse(handler.config || '{}')
            
            // Prüfe Übereinstimmung der Domäne und Subdomäne
            const domainMatch = handlerMeta.suggestedMetadata?.domain === contentType.metadata.domain
            const subDomainMatch = handlerMeta.suggestedMetadata?.subDomain === contentType.metadata.subDomain
            
            // Prüfe Überschneidungen in Keywords und Coverage
            const keywords = new Set([
              ...(handlerConfig.metadata?.keywords || []),
              ...(contentType.metadata.keywords || [])
            ])
            const keywordOverlap = keywords.size < (
              (handlerConfig.metadata?.keywords?.length || 0) +
              (contentType.metadata.keywords?.length || 0)
            )
            
            // Prüfe Überschneidungen in der Coverage
            const coverage = new Set([
              ...(handlerConfig.metadata?.coverage || []),
              ...(contentType.metadata.coverage || [])
            ])
            const coverageOverlap = coverage.size < (
              (handlerConfig.metadata?.coverage?.length || 0) +
              (contentType.metadata.coverage?.length || 0)
            )
            
            return (
              handler.type === contentType.type &&
              domainMatch &&
              (subDomainMatch || keywordOverlap || coverageOverlap)
            )
          } catch (error) {
            console.error(`[Upload ${jobId}] Fehler beim Parsen der Handler-Daten:`, error)
            return false
          }
        })

        if (similarHandler) {
          console.log(`[Upload ${jobId}] Ähnlicher Handler gefunden: ${similarHandler.id}`)
          
          // Erweitere existierenden Handler
          const handlerConfig = JSON.parse(similarHandler.config || '{}')
          const handlerMeta = JSON.parse(similarHandler.metadata || '{}')
          
          // Füge neue Keywords und Coverage hinzu
          const updatedConfig = {
            ...handlerConfig,
            metadata: {
              ...handlerConfig.metadata,
              keywords: Array.from(new Set([
                ...(handlerConfig.metadata?.keywords || []),
                ...(contentType.metadata.keywords || [])
              ])),
              coverage: Array.from(new Set([
                ...(handlerConfig.metadata?.coverage || []),
                ...(contentType.metadata.coverage || [])
              ])),
              relatedTopics: Array.from(new Set([
                ...(handlerConfig.metadata?.relatedTopics || []),
                ...(contentType.metadata.relatedTopics || [])
              ]))
            }
          }
          
          // Aktualisiere Handler
          await prisma.template_handlers.update({
            where: { id: similarHandler.id },
            data: {
              config: JSON.stringify(updatedConfig),
              metadata: JSON.stringify({
                ...handlerMeta,
                lastUpdate: new Date().toISOString(),
                documentCount: (handlerMeta.documentCount || 1) + 1,
                documents: [
                  ...(handlerMeta.documents || []),
                  {
                    filename: file.name,
                    addedAt: new Date().toISOString(),
                    confidence: contentType.confidence
                  }
                ]
              })
            }
          })
          
          console.log(`[Upload ${jobId}] Handler ${similarHandler.id} aktualisiert`)
        } else {
          // Erstelle neuen Handler nur wenn kein ähnlicher gefunden wurde
          console.log(`[Upload ${jobId}] Kein ähnlicher Handler gefunden, erstelle neuen...`)
          
          // Bestimme Handler-Capabilities basierend auf Content-Type
          const capabilities = ['search', 'extract']
          if (contentType.type === BaseContentTypes.SERVICE) capabilities.push('service')
          if (contentType.type === BaseContentTypes.PRODUCT) capabilities.push('product')
          if (contentType.type === BaseContentTypes.FAQ) capabilities.push('faq')
          if (contentType.type === BaseContentTypes.CONTACT) capabilities.push('contact')
          if (contentType.type === BaseContentTypes.EVENT) capabilities.push('event')
          if (contentType.type === BaseContentTypes.DOWNLOAD) capabilities.push('download')
          if (contentType.type === BaseContentTypes.VIDEO) capabilities.push('video')
          if (contentType.type === BaseContentTypes.LOCATION) capabilities.push('location')

          // Erstelle Handler-Konfiguration
          const handlerConfig = {
            id: nanoid(),
            templateId,
            type: contentType.type, // Verwende den erkannten Typ direkt
            name: `${contentType.metadata.domain} - ${contentType.metadata.subDomain}`,
            active: true,
            config: JSON.stringify({
              capabilities,
              patterns: contentType.patterns || [],
              metadata: contentType.metadata || {},
              settings: {
                matchThreshold: 0.8,
                contextWindow: 1000,
                maxTokens: 2000,
                dynamicResponses: true,
                includeLinks: contentType.type === BaseContentTypes.DOWNLOAD,
                includeContact: contentType.type === BaseContentTypes.CONTACT,
                includeSteps: contentType.type === BaseContentTypes.SERVICE || contentType.type === BaseContentTypes.PRODUCT,
                includePrice: contentType.type === BaseContentTypes.PRODUCT || contentType.type === BaseContentTypes.SERVICE,
                includeAvailability: contentType.type === BaseContentTypes.EVENT || contentType.type === BaseContentTypes.SERVICE,
                useExactMatches: contentType.confidence > 0.9
              }
            }),
            metadata: JSON.stringify({
              generated: true,
              timestamp: new Date().toISOString(),
              documentCount: 1,
              documents: [{
                filename: file.name,
                addedAt: new Date().toISOString(),
                confidence: contentType.confidence
              }],
              suggestedMetadata: contentType.metadata
            })
          }

          // Speichere Handler in der Datenbank
          console.log(`[Upload ${jobId}] Speichere Handler in der Datenbank...`)
          const handler = await prisma.template_handlers.create({
            data: handlerConfig
          })

          console.log(`[Upload ${jobId}] Handler erstellt:`, handler.id)
        }

        // Vektorisiere Content
        console.log(`[Upload ${jobId}] Vektorisiere Content von ${file.name}...`)
        await prisma.uploadJob.update({
          where: { id: jobId },
          data: {
            metadata: {
              currentOperation: `Vektorisiere Inhalt von ${file.name}`,
              processingDetails: {
                stage: 'vectorize',
                message: 'Erstelle Vektoren für Suche',
                step: 4,
                totalSteps: 4
              },
              detectedType: contentType.type,
              confidence: contentType.confidence
            }
          }
        })

        // Simuliere Vektorisierungsprozess
        await new Promise(resolve => setTimeout(resolve, 10000))
        
        const vectorResult = await vectorizer.vectorize({
          content,
          metadata: {
            filename: file.name,
            path: filePath,
            type: contentType.type,
            confidence: contentType.confidence
          }
        }) as VectorResult

        if (!vectorResult?.vectors) {
          throw new Error('Keine Vektoren generiert')
        }

        totalVectorCount += vectorResult.vectors.length

        // Aktualisiere Job-Status
        console.log(`[Upload ${jobId}] Aktualisiere Job-Status für ${file.name}...`)
        await prisma.uploadJob.update({
          where: { id: jobId },
          data: {
            processedFiles: i + 1,
            metadata: {
              lastProcessedFile: file.name,
              lastUpdateTime: new Date().toISOString(),
              processingDetails: {
                stage: 'complete',
                message: `Datei ${i + 1} von ${files.length} verarbeitet`,
                progress: ((i + 1) / files.length) * 100
              },
              currentOperation: `Datei ${file.name} verarbeitet`,
              vectorCount: vectorResult.vectors.length,
              vectorMetadata: vectorResult.metadata
            }
          }
        })

      } catch (error) {
        console.error(`[Upload ${jobId}] Fehler bei Datei ${file.name}:`, error)
        await prisma.uploadJob.update({
          where: { id: jobId },
          data: {
            metadata: {
              error: error instanceof Error ? error.message : 'Unbekannter Fehler',
              errorDetails: error instanceof Error ? error.stack : undefined,
              errorFile: file.name,
              processingDetails: {
                stage: 'error',
                message: `Fehler bei Verarbeitung von ${file.name}`
              }
            }
          }
        })
        throw error
      }
    }

    // Setze Job auf completed mit finalen Metadaten
    const endTime = new Date()
    const processingTime = endTime.getTime() - new Date(startTime).getTime()
    
    console.log(`[Upload ${jobId}] Upload-Verarbeitung abgeschlossen`)
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        metadata: {
          completionTime: endTime.toISOString(),
          processingDetails: {
            stage: 'completed',
            message: 'Alle Dateien erfolgreich verarbeitet'
          },
          currentOperation: 'Verarbeitung abgeschlossen',
          finalStats: {
            totalFiles: files.length,
            totalProcessingTime: processingTime,
            averageVectorCount: totalVectorCount / files.length,
            totalVectors: totalVectorCount
          }
        }
      }
    })

  } catch (error) {
    console.error(`[Upload ${jobId}] Kritischer Fehler:`, error)
    
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: 'error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unbekannter Fehler',
          errorTime: new Date().toISOString(),
          errorDetails: error instanceof Error ? error.stack : undefined,
          processingDetails: {
            stage: 'error',
            message: 'Kritischer Fehler bei der Verarbeitung'
          }
        }
      }
    })
    
    throw error
  }
}

function getStatusMessage(status: string): string {
  switch (status) {
    case 'uploading':
      return 'Dateien werden hochgeladen...'
    case 'processing':
      return 'Dateien werden verarbeitet...'
    case 'analyzing':
      return 'Inhalte werden analysiert...'
    case 'indexing':
      return 'Vektoren werden erstellt...'
    case 'completed':
      return 'Upload abgeschlossen'
    case 'error':
      return 'Fehler beim Upload'
    default:
      return 'Unbekannter Status'
  }
} 