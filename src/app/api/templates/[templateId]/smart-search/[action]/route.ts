import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { Crawler } from '@/lib/services/crawler'
import { OpenAIEmbedding } from '@/lib/services/embeddings'
import { getTemplate } from '@/lib/actions/templates'
import { z } from 'zod'
import OpenAI from 'openai'
import { VectorStore } from '@/lib/services/qdrant'

const redis = Redis.fromEnv()

// Validierung für Indexierungs-Request
const indexRequestSchema = z.object({
  urls: z.array(z.string().url()),
  excludePatterns: z.array(z.string()).optional()
})

// Validierung für Such-Request
const searchRequestSchema = z.object({
  query: z.string().min(3).max(500),
  context: z.string().optional()
})

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
    
    // Vektoren in Qdrant speichern
    const vectorStore = new VectorStore(`template_${jobId}`)
    await vectorStore.initialize()
    
    await vectorStore.upsertVectors(
      vectors.map((v, i) => ({
        id: `chunk_${i}`,
        values: v.vector,
        payload: {
          text: v.text,
          url: pages.find(p => p.chunks.includes(v.text))?.url
        }
      }))
    )
    
    // Job als erfolgreich markieren
    await redis.set(`job:${jobId}:status`, 'completed')
    await redis.set(`job:${jobId}:progress`, 100)
  } catch (error) {
    throw error
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { templateId: string; action: string } }
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

    // Route basierend auf Action
    switch (params.action) {
      case 'index':
        // Request validieren
        const indexBody = await request.json()
        const { urls, excludePatterns } = indexRequestSchema.parse(indexBody)
        
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

      case 'query':
        // Request validieren
        const queryBody = await request.json()
        const { query, context } = searchRequestSchema.parse(queryBody)
        
        // Vektoren laden
        const embedding = new OpenAIEmbedding(bot.smartSearch.apiKey)
        const queryVector = await embedding.getEmbedding(query)
        
        // Vektoren aus Qdrant laden und durchsuchen
        const vectorStore = new VectorStore(`template_${params.templateId}`)
        const similarResults = await vectorStore.searchSimilar(queryVector)
        const similarTexts = similarResults
          .filter((r): r is { score: number; payload: { text: string } } => 
            r !== null && 
            typeof r === 'object' &&
            'score' in r &&
            typeof r.score === 'number' &&
            'payload' in r &&
            r.payload !== null && 
            typeof r.payload === 'object' &&
            'text' in r.payload && 
            typeof r.payload.text === 'string'
          )
          .map(r => r.payload.text)

        if (similarTexts.length === 0) {
          return NextResponse.json({ 
            error: 'Keine relevanten Informationen gefunden' 
          }, { status: 404 })
        }
        
        // Antwort generieren
        const openai = new OpenAI({ apiKey: bot.smartSearch.apiKey })
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `Du bist ein hilfreicher Assistent. Beantworte die Frage basierend auf den gegebenen Informationen. 
                       Wenn du die Antwort nicht in den Informationen findest, sage das ehrlich.
                       Formatiere die Antwort schön mit Markdown.`
            },
            {
              role: 'user',
              content: `Kontext: ${similarTexts.join('\n\n')}
                       ${context ? `Zusätzlicher Kontext: ${context}\n` : ''}
                       Frage: ${query}`
            }
          ],
          temperature: bot.smartSearch?.temperature || 0.1,
          max_tokens: bot.smartSearch?.maxTokensPerRequest || 500
        })
        
        return NextResponse.json({
          answer: completion.choices[0].message.content,
          sources: similarTexts
        })

      default:
        return NextResponse.json({ error: 'Ungültige Action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('API-Fehler:', error)
    return NextResponse.json(
      { error: error.message || 'Interner Server-Fehler' },
      { status: error.status || 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string; action: string } }
) {
  if (params.action !== 'status') {
    return NextResponse.json({ error: 'Ungültige Action' }, { status: 400 })
  }

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