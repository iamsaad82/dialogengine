import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { ContentVectorizer } from '@/lib/services/vectorizer'
import { ContentTypeDetector } from '@/lib/services/detector'

// Initialisiere Services
const detector = new ContentTypeDetector()
let vectorizer: ContentVectorizer

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

async function processUpload(jobId: string, files: File[], templateId: string) {
  try {
    // Erstelle Upload-Verzeichnis
    const uploadDir = join(process.cwd(), 'uploads', templateId)
    await mkdir(uploadDir, { recursive: true })

    // Verarbeite jede Datei
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Update Status auf "processing"
      await prisma.uploadJob.update({
        where: { id: jobId },
        data: {
          status: 'processing',
          processedFiles: i,
          metadata: {
            currentFile: file.name,
            currentOperation: 'Speichere Datei...'
          }
        }
      })

      // 1. Speichere die Datei
      const fileName = `${Date.now()}-${file.name}`
      const filePath = join(uploadDir, fileName)
      const bytes = await file.arrayBuffer()
      await writeFile(filePath, Buffer.from(bytes))

      // 2. Extrahiere Text
      await prisma.uploadJob.update({
        where: { id: jobId },
        data: {
          status: 'analyzing',
          metadata: {
            currentFile: file.name,
            currentOperation: 'Extrahiere Text...'
          }
        }
      })

      const fileContent = await file.text()

      // 3. Analysiere Content-Typen
      await prisma.uploadJob.update({
        where: { id: jobId },
        data: {
          status: 'analyzing',
          metadata: {
            currentFile: file.name,
            currentOperation: 'Analysiere Content-Typen...'
          }
        }
      })

      const detectionResult = await detector.detect(fileContent)

      // 4. Erstelle Vektoren
      await prisma.uploadJob.update({
        where: { id: jobId },
        data: {
          status: 'indexing',
          metadata: {
            currentFile: file.name,
            currentOperation: 'Erstelle Vektoren...',
            detectedTypes: detectionResult.types
          }
        }
      })

      // Initialisiere Vectorizer wenn noch nicht geschehen
      if (!vectorizer) {
        vectorizer = new ContentVectorizer({
          openaiApiKey: process.env.OPENAI_API_KEY || '',
          pineconeApiKey: process.env.PINECONE_API_KEY || '',
          pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
          pineconeIndex: process.env.PINECONE_INDEX || '',
          templateId
        })
      }

      // Vektorisiere den Inhalt
      await vectorizer.vectorize({
        content: fileContent,
        metadata: {
          filename: file.name,
          path: filePath,
          type: detectionResult.types[0]?.type || 'unknown',
          confidence: detectionResult.types[0]?.confidence || 0
        }
      })

      // Update Fortschritt
      await prisma.uploadJob.update({
        where: { id: jobId },
        data: {
          processedFiles: i + 1,
          status: i === files.length - 1 ? 'complete' : 'processing',
          metadata: {
            currentFile: file.name,
            currentOperation: i === files.length - 1 ? 'Abgeschlossen' : 'Verarbeite nächste Datei...',
            detectedTypes: detectionResult.types
          }
        }
      })
    }

    // Setze finalen Status
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: 'complete',
        metadata: {
          currentOperation: 'Upload abgeschlossen',
          completedAt: new Date().toISOString()
        }
      }
    })

  } catch (error) {
    console.error('Fehler bei der Verarbeitung:', error)
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: 'error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unbekannter Fehler',
          errorTimestamp: new Date().toISOString()
        }
      }
    })
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
    case 'complete':
      return 'Upload abgeschlossen'
    case 'error':
      return 'Fehler beim Upload'
    default:
      return 'Unbekannter Status'
  }
} 