import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/templates
export async function GET() {
  try {
    const templates = await prisma.template.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        active: true,
        subdomain: true,
        jsonContent: true,
        jsonBranding: true,
        jsonBot: true,
        jsonMeta: true,
        createdAt: true,
        updatedAt: true,
        flowiseConfigId: true
      }
    })
    
    // Safely parse JSON fields
    const safeTemplates = templates.map(template => {
      try {
        return {
          ...template,
          jsonContent: template.jsonContent ? JSON.parse(template.jsonContent) : {},
          jsonBranding: template.jsonBranding ? JSON.parse(template.jsonBranding) : {},
          jsonBot: template.jsonBot ? JSON.parse(template.jsonBot) : {},
          jsonMeta: template.jsonMeta ? JSON.parse(template.jsonMeta) : {}
        }
      } catch (e) {
        console.error('Error parsing JSON for template:', template.id, e)
        return template
      }
    })
    
    return new NextResponse(JSON.stringify(safeTemplates), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('GET error:', error)
    return NextResponse.json({ error: "Fehler beim Laden der Templates" }, { status: 500 })
  }
}

// POST /api/templates
export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('POST body:', body)
    
    // If ID is present, treat it as an update
    if (body.id) {
      const template = await prisma.template.update({
        where: { id: body.id },
        data: {
          name: body.name,
          type: (body.type || "NEUTRAL").toUpperCase() as "NEUTRAL" | "INDUSTRY" | "CUSTOM",
          active: body.active ?? true,
          subdomain: body.subdomain,
          jsonContent: typeof body.jsonContent === 'string' ? body.jsonContent : JSON.stringify(body.jsonContent || {}),
          jsonBranding: typeof body.jsonBranding === 'string' ? body.jsonBranding : JSON.stringify(body.jsonBranding || {}),
          jsonBot: typeof body.jsonBot === 'string' ? body.jsonBot : JSON.stringify(body.jsonBot || {}),
          jsonMeta: typeof body.jsonMeta === 'string' ? body.jsonMeta : JSON.stringify(body.jsonMeta || {})
        }
      })

      return NextResponse.json(template)
    }
    
    // Create new template if no ID is present
    const template = await prisma.template.create({
      data: {
        name: body.name || "Neues Template",
        type: (body.type || "NEUTRAL").toUpperCase() as "NEUTRAL" | "INDUSTRY" | "CUSTOM",
        active: body.active ?? true,
        subdomain: body.subdomain || `template-${Date.now()}`,
        jsonContent: typeof body.jsonContent === 'string' ? body.jsonContent : JSON.stringify(body.jsonContent || {}),
        jsonBranding: typeof body.jsonBranding === 'string' ? body.jsonBranding : JSON.stringify(body.jsonBranding || {}),
        jsonBot: typeof body.jsonBot === 'string' ? body.jsonBot : JSON.stringify(body.jsonBot || {}),
        jsonMeta: typeof body.jsonMeta === 'string' ? body.jsonMeta : JSON.stringify(body.jsonMeta || {})
      }
    })

    return NextResponse.json(template)
  } catch (error: any) {
    console.error('POST error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "Subdomain bereits vorhanden" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Templates" },
      { status: 500 }
    )
  }
}

// PUT /api/templates/:id
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    console.log('PUT body:', body)

    if (!body.id) {
      return NextResponse.json({ error: "ID fehlt" }, { status: 400 })
    }

    const template = await prisma.template.update({
      where: { id: body.id },
      data: {
        name: body.name,
        type: (body.type || "NEUTRAL").toUpperCase() as "NEUTRAL" | "INDUSTRY" | "CUSTOM",
        active: body.active ?? true,
        subdomain: body.subdomain,
        jsonContent: typeof body.jsonContent === 'string' ? body.jsonContent : JSON.stringify(body.jsonContent || {}),
        jsonBranding: typeof body.jsonBranding === 'string' ? body.jsonBranding : JSON.stringify(body.jsonBranding || {}),
        jsonBot: typeof body.jsonBot === 'string' ? body.jsonBot : JSON.stringify(body.jsonBot || {}),
        jsonMeta: typeof body.jsonMeta === 'string' ? body.jsonMeta : JSON.stringify(body.jsonMeta || {})
      }
    })

    console.log('Updated template:', template)
    return NextResponse.json(template)

  } catch (error: any) {
    console.error('PUT error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "Subdomain bereits vorhanden" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Templates" },
      { status: 500 }
    )
  }
}

// DELETE /api/templates/:id
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: "ID fehlt" }, { status: 400 })
    }

    await prisma.template.delete({
      where: { id }
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('DELETE error:', error)
    return NextResponse.json(
      { error: "Fehler beim Löschen des Templates" },
      { status: 500 }
    )
  }
} 