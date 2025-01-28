import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { question, history, flowiseId } = body

    // Hole die Flowise-Konfiguration
    const flowiseConfig = await prisma.flowiseConfig.findFirst()
    if (!flowiseConfig) {
      return NextResponse.json({ error: 'Flowise nicht konfiguriert' }, { status: 400 })
    }

    // Baue die Flowise-URL zusammen
    const flowiseUrl = `${flowiseConfig.url}/api/v1/prediction/${flowiseId}`

    // Sende Anfrage an Flowise
    const response = await fetch(flowiseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(flowiseConfig.apiKey ? { 'Authorization': `Bearer ${flowiseConfig.apiKey}` } : {})
      },
      body: JSON.stringify({
        question,
        history
      })
    })

    if (!response.ok) {
      throw new Error('Flowise-Anfrage fehlgeschlagen')
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 