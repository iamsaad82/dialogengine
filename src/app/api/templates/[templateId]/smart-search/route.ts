import { NextRequest, NextResponse } from 'next/server'

// Temporär deaktiviert, da Smart Search noch in Entwicklung ist
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Smart Search ist derzeit in Entwicklung.' },
    { status: 503 }
  )
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Smart Search ist derzeit in Entwicklung.' },
    { status: 503 }
  )
} 