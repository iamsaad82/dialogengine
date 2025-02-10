import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

const createDefaultBot = () => ({
  type: 'examples',
  examples: []
})

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

export async function POST(req: Request) {
  try {
    const data = await req.json()
    
    // Validiere die Subdomain (nur Kleinbuchstaben, Zahlen und Bindestriche)
    const subdomain = (data.subdomain || '').toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    // Prüfe ob die Subdomain bereits existiert
    if (subdomain) {
      const existing = await prisma.template.findFirst({
        where: { subdomain }
      })
      if (existing) {
        return NextResponse.json(
          { error: "Diese Subdomain wird bereits verwendet" },
          { status: 400 }
        )
      }
    }

    // Erstelle Standardwerte für alle JSON-Felder
    const defaultContent = createDefaultContent()
    const defaultBranding = createDefaultBranding()
    const defaultBot = createDefaultBot()
    const defaultMeta = createDefaultMeta(data.name || 'Neues Template')

    // Validiere und parse die eingehenden JSON-Daten
    let content, branding, bot, meta
    try {
      content = data.jsonContent ? JSON.parse(data.jsonContent) : defaultContent
    } catch (e) {
      content = defaultContent
    }
    try {
      branding = data.jsonBranding ? JSON.parse(data.jsonBranding) : defaultBranding
    } catch (e) {
      branding = defaultBranding
    }
    try {
      bot = data.jsonBot ? JSON.parse(data.jsonBot) : defaultBot
    } catch (e) {
      bot = defaultBot
    }
    try {
      meta = data.jsonMeta ? JSON.parse(data.jsonMeta) : defaultMeta
    } catch (e) {
      meta = defaultMeta
    }

    const template = await prisma.template.create({
      data: {
        name: data.name || 'Neues Template',
        type: data.type || 'NEUTRAL',
        subdomain: subdomain,
        active: true,
        jsonContent: JSON.stringify(content),
        jsonBranding: JSON.stringify(branding),
        jsonBot: JSON.stringify(bot),
        jsonMeta: JSON.stringify(meta)
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
    let content, branding, bot, meta

    try {
      content = typeof data.jsonContent === 'string' 
        ? JSON.parse(data.jsonContent)
        : data.jsonContent || (existingTemplate.jsonContent ? JSON.parse(existingTemplate.jsonContent) : createDefaultContent())
    } catch (e) {
      content = createDefaultContent()
    }

    try {
      branding = typeof data.jsonBranding === 'string'
        ? JSON.parse(data.jsonBranding)
        : data.jsonBranding || (existingTemplate.jsonBranding ? JSON.parse(existingTemplate.jsonBranding) : createDefaultBranding())
    } catch (e) {
      branding = createDefaultBranding()
    }

    try {
      bot = typeof data.jsonBot === 'string'
        ? JSON.parse(data.jsonBot)
        : data.jsonBot || (existingTemplate.jsonBot ? JSON.parse(existingTemplate.jsonBot) : createDefaultBot())
    } catch (e) {
      bot = createDefaultBot()
    }

    try {
      meta = typeof data.jsonMeta === 'string'
        ? JSON.parse(data.jsonMeta)
        : data.jsonMeta || (existingTemplate.jsonMeta ? JSON.parse(existingTemplate.jsonMeta) : createDefaultMeta(data.name || existingTemplate.name))
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
        jsonContent: JSON.stringify(content),
        jsonBranding: JSON.stringify(branding),
        jsonBot: JSON.stringify(bot),
        jsonMeta: JSON.stringify(meta)
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