import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; action: string } }
) {
  try {
    const { feedback, sessionId } = await request.json()
    
    // Feedback für Debugging loggen
    console.log('Feedback erhalten:', {
      templateId: params.id,
      sessionId,
      feedback
    })

    return NextResponse.json({ 
      success: true,
      message: 'Feedback-Funktionalität ist in Entwicklung'
    })
  } catch (error) {
    console.error('Smart Search Action-Fehler:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}