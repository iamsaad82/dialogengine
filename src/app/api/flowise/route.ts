import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validierungsschema
const flowiseConfigSchema = z.object({
  url: z.string().url(),
  apiKey: z.string().optional(),
  responseRules: z.array(z.any()).default([]),
  defaultButtons: z.array(z.any()).default([])
})

// GET /api/flowise
export async function GET() {
  try {
    const configs = await prisma.flowiseConfig.findMany({
      include: {
        templates: true
      }
    })
    return NextResponse.json(configs)
  } catch (error) {
    console.error('Fehler beim Laden der Flowise-Konfigurationen:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Flowise-Konfigurationen' },
      { status: 500 }
    )
  }
}

// POST /api/flowise
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = flowiseConfigSchema.parse(body)

    const config = await prisma.flowiseConfig.create({
      data: {
        url: validatedData.url,
        apiKey: validatedData.apiKey,
        responseRules: validatedData.responseRules,
        defaultButtons: validatedData.defaultButtons
      }
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error('Fehler beim Erstellen der Flowise-Konfiguration:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Flowise-Konfiguration' },
      { status: 500 }
    )
  }
}

// PUT /api/flowise/:id
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    const validatedData = flowiseConfigSchema.parse(data)

    const config = await prisma.flowiseConfig.update({
      where: { id },
      data: {
        url: validatedData.url,
        apiKey: validatedData.apiKey,
        responseRules: validatedData.responseRules,
        defaultButtons: validatedData.defaultButtons
      }
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Flowise-Konfiguration:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Flowise-Konfiguration' },
      { status: 500 }
    )
  }
}

// DELETE /api/flowise/:id
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID ist erforderlich' },
        { status: 400 }
      )
    }

    await prisma.flowiseConfig.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Löschen der Flowise-Konfiguration:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Flowise-Konfiguration' },
      { status: 500 }
    )
  }
} 