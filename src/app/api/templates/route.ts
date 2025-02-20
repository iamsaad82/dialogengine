import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { type NextRequest } from 'next/server'

const createDefaultContent = () => ({
  hero: {
    title: 'Willkommen',
    subtitle: 'Untertitel hier einfügen',
    description: 'Beschreibung hier einfügen'
  },
  showcase: {
    image: '',
    altText: '',
    context: {
      title: 'Showcase Titel',
      description: 'Showcase Beschreibung'
    },
    cta: {
      title: 'Haben Sie Fragen?',
      question: 'Wie können wir Ihnen helfen?'
    }
  },
  features: [],
  contact: {
    title: 'Kontakt',
    description: 'Kontaktieren Sie uns',
    email: '',
    buttonText: 'Kontakt aufnehmen'
  },
  dialog: {
    title: 'Chat',
    description: 'Wie können wir Ihnen helfen?'
  }
})

const createDefaultBranding = () => ({
  colors: {
    primary: '#0099ff',
    secondary: '#ffffff',
    background: '#ffffff',
    text: '#000000'
  },
  logo: '',
  font: 'Inter'
})

const createDefaultHandlers = () => ([
  {
    type: 'medical',
    active: true,
    metadata: {
      keyTopics: ['Impfung', 'Gesundheit', 'Vorsorge'],
      entities: ['Arzt', 'Patient', 'Krankenkasse'],
      facts: []
    },
    responses: [
      {
        type: 'dynamic',
        templates: [
          "Basierend auf den medizinischen Informationen: {{facts}}",
          "Die wichtigsten medizinischen Fakten dazu sind: {{facts}}"
        ]
      }
    ]
  }
])

const createDefaultMeta = (name: string) => ({
  title: name || 'Neues Template',
  description: 'Ein neues Dialog Engine Template',
  keywords: []
})

export async function GET() {
  try {
    const templates = await prisma.template.findMany({
      orderBy: {
        updatedAt: 'desc'
      }
    })
    return NextResponse.json(templates)
  } catch (error) {
    console.error('GET error:', error)
    return NextResponse.json(
      { error: "Fehler beim Laden der Templates" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const template = await prisma.template.create({
      data: {
        name: body.name || 'Neues Template',
        type: body.type || 'NEUTRAL',
        active: true,
        subdomain: body.subdomain || 'test',
        branding: body.branding || createDefaultBranding(),
        config: body.config || {},
        content: body.content || createDefaultContent(),
        description: body.description || 'Ein neues Template',
        handlers: body.handlers || createDefaultHandlers(),
        meta: body.meta || createDefaultMeta(body.name),
        responses: body.responses || { rules: [], templates: [] }
      }
    })
    
    return NextResponse.json(template)
  } catch (error) {
    console.error('POST error:', error)
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Templates" },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  try {
    const data = await req.json()
    
    if (!data.id) {
      return NextResponse.json(
        { error: "Template ID ist erforderlich" },
        { status: 400 }
      )
    }

    // Validiere die Subdomain
    let subdomain = data.subdomain || ''
    if (subdomain) {
      subdomain = subdomain.toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      // Prüfe ob die Subdomain bereits von einem anderen Template verwendet wird
      const existing = await prisma.template.findFirst({
        where: {
          subdomain,
          id: { not: data.id }
        }
      })
      if (existing) {
        return NextResponse.json(
          { error: "Diese Subdomain wird bereits verwendet" },
          { status: 400 }
        )
      }
    }

    // Hole das existierende Template
    const existingTemplate = await prisma.template.findUnique({
      where: { id: data.id }
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template nicht gefunden" },
        { status: 404 }
      )
    }

    // Parse und validiere die JSON-Felder
    let content, branding, handlers, meta

    try {
      content = typeof data.content === 'string' 
        ? JSON.parse(data.content)
        : data.content || existingTemplate.content || createDefaultContent()
    } catch (e) {
      content = createDefaultContent()
    }

    try {
      branding = typeof data.branding === 'string'
        ? JSON.parse(data.branding)
        : data.branding || existingTemplate.branding || createDefaultBranding()
    } catch (e) {
      branding = createDefaultBranding()
    }

    try {
      handlers = typeof data.handlers === 'string'
        ? JSON.parse(data.handlers)
        : data.handlers || existingTemplate.handlers || createDefaultHandlers()
    } catch (e) {
      handlers = createDefaultHandlers()
    }

    try {
      meta = typeof data.meta === 'string'
        ? JSON.parse(data.meta)
        : data.meta || existingTemplate.meta || createDefaultMeta(data.name || existingTemplate.name)
    } catch (e) {
      meta = createDefaultMeta(data.name || existingTemplate.name)
    }

    const template = await prisma.template.update({
      where: { id: data.id },
      data: {
        name: data.name || existingTemplate.name,
        type: data.type || existingTemplate.type,
        subdomain: subdomain,
        active: data.active ?? existingTemplate.active,
        content: content,
        branding: branding,
        handlers: handlers,
        meta: meta,
        config: data.config || existingTemplate.config || {},
        description: data.description || existingTemplate.description
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('PUT error:', error)
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Templates" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { error: "ID ist erforderlich" },
        { status: 400 }
      )
    }
    await prisma.template.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE error:', error)
    return NextResponse.json(
      { error: "Fehler beim Löschen des Templates" },
      { status: 500 }
    )
  }
} 