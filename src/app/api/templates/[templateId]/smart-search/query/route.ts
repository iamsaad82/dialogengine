import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { OpenAIEmbedding } from '@/lib/services/embeddings'
import { getTemplate } from '@/lib/actions/templates'
import { OpenAI } from 'openai'
import { z } from 'zod'

const redis = Redis.fromEnv()

// Validierung für Such-Request
const searchRequestSchema = z.object({
  query: z.string().min(3).max(500),
  context: z.string().optional()
})

// POST /api/templates/[templateId]/smart-search/query
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
    const { query, context } = searchRequestSchema.parse(body)
    
    // Vektoren laden
    const vectors = await redis.get<{ text: string; vector: number[] }[]>(`vectors:${params.templateId}`)
    if (!vectors || vectors.length === 0) {
      return NextResponse.json({ error: 'Keine Daten indexiert' }, { status: 400 })
    }
    
    // Ähnliche Texte finden
    const embedding = new OpenAIEmbedding(bot.smartSearch.apiKey)
    const similarTexts = await embedding.findSimilar(query, vectors)
    
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
  } catch (error: any) {
    console.error('API-Fehler:', error)
    return NextResponse.json(
      { error: error.message || 'Interner Server-Fehler' },
      { status: error.status || 500 }
    )
  }
} 