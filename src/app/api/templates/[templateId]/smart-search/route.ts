import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { Crawler } from '@/lib/services/crawler'
import { OpenAIEmbedding } from '@/lib/services/embeddings'
import { getTemplate } from '@/lib/actions/templates'
import { z } from 'zod'

const redis = Redis.fromEnv()

// Validierung für Indexierungs-Request
const indexRequestSchema = z.object({
  urls: z.array(z.string().url()),
  excludePatterns: z.array(z.string()).optional()
})

// POST /api/templates/[templateId]/smart-search/index
export async function POST(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    // Template und Bot-Konfiguration laden
    const template = await getTemplate(params.templateId)
    if (!template) {
      return NextResponse.json({ error: 'Template nicht gefunden' }, { status: 404 })
    }
    
    const bot = JSON.parse(template.jsonBot)
    if (!bot.smartSearch?.apiKey) {
      return NextResponse.json({ error: 'API-Key fehlt' }, { status: 400 })
    }
    
    // Request validieren
    const body = await request.json()
    const { urls, excludePatterns } = indexRequestSchema.parse(body)
    
    // Indexierungs-Job starten
    const jobId = `index:${params.templateId}:${Date.now()}`
    await redis.set(`job:${jobId}:status`, 'running')
    
    // Asynchrone Verarbeitung starten
    indexPages(jobId, urls, excludePatterns, bot.smartSearch.apiKey).catch(error => {
      console.error('Indexierungs-Fehler:', error)
      redis.set(`job:${jobId}:status`, 'error')
      redis.set(`job:${jobId}:error`, error.message)
    })
    
    return NextResponse.json({ jobId })
  } catch (error: any) {
    console.error('API-Fehler:', error)
    return NextResponse.json(
      { error: error.message || 'Interner Server-Fehler' },
      { status: error.status || 500 }
    )
  }
}

// GET /api/templates/[templateId]/smart-search/status
export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const jobId = request.nextUrl.searchParams.get('jobId')
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID fehlt' }, { status: 400 })
    }
    
    const [status, error, progress] = await Promise.all([
      redis.get<string>(`job:${jobId}:status`),
      redis.get<string>(`job:${jobId}:error`),
      redis.get<number>(`job:${jobId}:progress`)
    ])
    
    return NextResponse.json({ status, error, progress })
  } catch (error: any) {
    console.error('API-Fehler:', error)
    return NextResponse.json(
      { error: error.message || 'Interner Server-Fehler' },
      { status: error.status || 500 }
    )
  }
}

// Hilfsfunktion für die Indexierung
async function indexPages(jobId: string, urls: string[], excludePatterns: string[] = [], apiKey: string) {
  try {
    // Crawler initialisieren
    const crawler = new Crawler({ urls, excludePatterns })
    const pages = await crawler.crawl()
    
    // Fortschritt aktualisieren
    await redis.set(`job:${jobId}:progress`, 50)
    
    // Embeddings erstellen
    const embedding = new OpenAIEmbedding(apiKey)
    const chunks = pages.flatMap(page => page.chunks)
    const vectors = await embedding.embedChunks(chunks)
    
    // Vektoren speichern
    await redis.set(`vectors:${jobId}`, vectors)
    
    // Job als erfolgreich markieren
    await redis.set(`job:${jobId}:status`, 'completed')
    await redis.set(`job:${jobId}:progress`, 100)
  } catch (error) {
    throw error
  }
} 