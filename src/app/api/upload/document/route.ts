import { NextRequest, NextResponse } from 'next/server'
import { WebsiteScanner } from '@/lib/services/scanner'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { mkdir } from 'fs/promises'

// Erlaubte Dateitypen
const ALLOWED_TYPES = [
  'text/markdown',
  'text/plain',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

// Dateierweiterungen zu MIME-Types Mapping
const EXTENSION_MIME_MAP: Record<string, string> = {
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const jobId = formData.get('jobId') as string
    const templateId = formData.get('templateId') as string

    if (!file || !jobId || !templateId) {
      return NextResponse.json({
        success: false,
        message: 'Datei, Job-ID und Template-ID sind erforderlich'
      }, { status: 400 })
    }

    // Überprüfe Dateityp anhand der Dateiendung
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    const mimeType = EXTENSION_MIME_MAP[fileExtension] || file.type

    if (!ALLOWED_TYPES.includes(mimeType)) {
      return NextResponse.json({
        success: false,
        message: `Nicht unterstützter Dateityp. Erlaubte Typen: .md, .txt, .pdf, .doc, .docx`
      }, { status: 400 })
    }

    // Erstelle Upload-Verzeichnis
    const uploadDir = join(process.cwd(), 'uploads', templateId)
    await mkdir(uploadDir, { recursive: true })

    // Generiere eindeutigen Dateinamen
    const fileName = `${jobId}-${file.name}`
    const filePath = join(uploadDir, fileName)

    // Speichere die Datei
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Initialisiere den Scanner
    const scanner = new WebsiteScanner({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      pineconeApiKey: process.env.PINECONE_API_KEY!,
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT!,
      pineconeIndex: process.env.PINECONE_INDEX!,
      templateId,
      redisUrl: process.env.REDIS_URL
    })

    // Verarbeite die hochgeladene Datei
    await scanner.processUploadedFile(filePath)

    return NextResponse.json({
      success: true,
      message: 'Datei erfolgreich hochgeladen und verarbeitet',
      filePath,
      jobId
    })

  } catch (error) {
    console.error('Fehler beim Datei-Upload:', error)
    
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

    // Initialisiere den Scanner nur für Status-Abfrage
    const scanner = new WebsiteScanner({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      pineconeApiKey: process.env.PINECONE_API_KEY!,
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT!,
      pineconeIndex: process.env.PINECONE_INDEX!,
      templateId,
      redisUrl: process.env.REDIS_URL
    })

    // Hole den aktuellen Status
    const status = await scanner.getScanStatus()

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