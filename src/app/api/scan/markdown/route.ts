import { NextRequest, NextResponse } from 'next/server'
import { WebsiteScanner } from '@/lib/services/scanner'
import { z } from 'zod'
import * as path from 'path'

// Validierungsschema für die Anfrage
const requestSchema = z.object({
  directory: z.string().min(1, 'Verzeichnispfad ist erforderlich'),
  templateId: z.string().min(1, 'Template ID ist erforderlich'),
  options: z.object({
    recursive: z.boolean().optional(),
    includePatterns: z.array(z.string()).optional(),
    excludePatterns: z.array(z.string()).optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    // Extrahiere und validiere die Anfragedaten
    const body = await request.json()
    const { directory, templateId, options } = requestSchema.parse(body)

    // Sicherheitscheck: Stelle sicher, dass das Verzeichnis im erlaubten Bereich liegt
    const normalizedPath = path.normalize(directory)
    const allowedBasePath = process.env.MARKDOWN_BASE_PATH
    
    if (!allowedBasePath || !normalizedPath.startsWith(allowedBasePath)) {
      return NextResponse.json({
        success: false,
        message: 'Zugriff auf dieses Verzeichnis nicht erlaubt'
      }, { status: 403 })
    }

    // Initialisiere den Scanner mit Umgebungsvariablen
    const scanner = new WebsiteScanner({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      pineconeApiKey: process.env.PINECONE_API_KEY!,
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT!,
      pineconeIndex: process.env.PINECONE_INDEX!,
      templateId,
      redisUrl: process.env.REDIS_URL
    })

    // Starte den Scan-Prozess
    await scanner.scanMarkdownDirectory(normalizedPath)

    return NextResponse.json({
      success: true,
      message: 'Markdown-Scan erfolgreich gestartet',
      directory: normalizedPath,
      templateId
    })
  } catch (error) {
    console.error('Fehler beim Markdown-Scan:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Validierungsfehler',
        errors: error.errors
      }, { status: 400 })
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
    const templateId = searchParams.get('templateId')

    if (!templateId) {
      return NextResponse.json({
        success: false,
        message: 'Template ID ist erforderlich'
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

    // Hole den aktuellen Scan-Status
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