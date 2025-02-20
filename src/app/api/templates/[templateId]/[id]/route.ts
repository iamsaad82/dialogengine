import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { templateSchema } from '@/lib/schemas/template'
import { z } from 'zod'

const updateTemplateSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  active: z.boolean().optional(),
  subdomain: z.string().optional(),
  description: z.string().optional(),
  branding: z.any().optional(),
  config: z.any().optional(),
  content: z.any().optional(),
  meta: z.any().optional(),
  responses: z.any().optional(),
  bot_type: z.string().optional(),
  bot_config: z.any().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const template = await prisma.template.findUnique({
      where: { id: params.templateId },
      include: {
        extractionSchema: true
      }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Fehler beim Laden des Templates:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden des Templates' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    // Validiere die Subdomain (nur Kleinbuchstaben, Zahlen und Bindestriche)
    let subdomain = body.subdomain || ''
    if (subdomain) {
      subdomain = subdomain.toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      // Prüfe ob die Subdomain bereits von einem anderen Template verwendet wird
      const existing = await prisma.template.findFirst({
        where: {
          subdomain,
          id: { not: params.id }
        }
      })
      if (existing) {
        return NextResponse.json(
          { error: "Diese Subdomain wird bereits verwendet" },
          { status: 400 }
        )
      }
    }

    const template = await prisma.template.update({
      where: {
        id: params.id
      },
      data: {
        name: body.name,
        type: body.type,
        subdomain: subdomain,
        active: body.active
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Templates:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
} 