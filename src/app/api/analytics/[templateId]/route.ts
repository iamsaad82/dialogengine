import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma, PrismaClient } from '@prisma/client'

export async function GET(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const templateId = params.templateId

    // Basis-Statistiken
    const totalQuestions = await prisma.chatLog.count({
      where: { templateId }
    })

    const answeredQuestions = await prisma.chatLog.count({
      where: { 
        templateId,
        wasAnswered: true 
      }
    })

    // Letzte 10 Fragen mit Antworten
    const recentQuestions = await prisma.chatLog.findMany({
      where: { templateId },
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        timestamp: true,
        question: true,
        answer: true,
        wasAnswered: true,
        sessionId: true
      },
      take: 10
    })

    // Häufigste unbeantwortete Fragen
    const unansweredQuestions = await prisma.chatLog.groupBy({
      by: ['question'],
      where: { 
        templateId,
        wasAnswered: false 
      },
      _count: {
        question: true
      },
      orderBy: {
        _count: {
          question: 'desc'
        }
      },
      take: 5
    })

    return NextResponse.json({
      totalQuestions,
      answeredQuestions,
      recentQuestions,
      unansweredQuestions
    })
  } catch (error) {
    console.error('Analytics Error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 