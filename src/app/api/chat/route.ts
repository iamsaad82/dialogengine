import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BotService } from '@/lib/services/bot/BotService'
import { z } from 'zod'

// Validierungsschema für Chat-Anfragen
const chatRequestSchema = z.object({
  message: z.string().min(1),
  templateId: z.string(),
  sessionId: z.string(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional()
})

export async function POST(request: Request) {
  try {
    // Parse und validiere Request
    const body = await request.json()
    const validatedData = chatRequestSchema.parse(body)

    // Hole Template-Konfiguration
    const template = await prisma.template.findUnique({
      where: { id: validatedData.templateId }
    })

    if (!template || !template.jsonBot) {
      return NextResponse.json(
        { error: 'Template nicht gefunden' },
        { status: 404 }
      )
    }

    const botConfig = JSON.parse(template.jsonBot.toString())

    // Initialisiere BotService mit den Umgebungsvariablen
    const botService = new BotService({
      openaiApiKey: process.env.OPENAI_API_KEY,
      pineconeApiKey: process.env.PINECONE_API_KEY,
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT,
      pineconeIndex: process.env.PINECONE_INDEX,
      templateId: validatedData.templateId
    })

    // Verarbeite Nachricht
    const response = await botService.processMessage(
      validatedData.message,
      validatedData.templateId,
      validatedData.history
    )

    // Speichere Chat-Log
    await prisma.chatLog.create({
      data: {
        templateId: validatedData.templateId,
        sessionId: validatedData.sessionId,
        question: validatedData.message,
        answer: response.text,
        wasAnswered: true
      }
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Chat API Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ungültige Anfrage', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 