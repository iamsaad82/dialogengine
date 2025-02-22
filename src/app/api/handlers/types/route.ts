import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { BaseContentTypes } from '@/lib/types/contentTypes'

type PrismaHandler = Prisma.JsonObject & {
  type: string
  metadata?: {
    capabilities?: string[]
    [key: string]: any
  } | null
}

type PrismaTemplate = {
  handlers: PrismaHandler[]
}

export async function GET() {
  try {
    // Hole alle aktiven Templates und ihre Handler
    const templates = await prisma.template.findMany({
      where: {
        active: true
      },
      select: {
        handlers: true
      }
    })

    // Erstelle eine Map für alle verfügbaren Handler-Typen
    const handlerTypes = new Map<string, {
      id: string
      label: string
      description?: string
      metadata?: {
        icon?: string
        category?: string
        capabilities?: string[]
      }
      count: number
    }>()

    // Füge zuerst alle Basis-Content-Types hinzu
    Object.entries(BaseContentTypes).forEach(([key, value]) => {
      handlerTypes.set(value, {
        id: value,
        label: getHandlerLabel(value),
        description: getHandlerDescription(value),
        metadata: {
          icon: getHandlerIcon(value),
          category: getHandlerCategory(value),
          capabilities: []
        },
        count: 0
      })
    })

    // Sammle dann alle Handler-Typen aus den Templates
    templates.forEach(template => {
      const handlers = template.handlers as PrismaHandler[]
      if (!Array.isArray(handlers)) return

      handlers.forEach(handler => {
        if (!handler.type) return

        const type = handler.type.toLowerCase()
        const existing = handlerTypes.get(type)

        if (existing) {
          existing.count++
          // Füge neue Capabilities hinzu
          if (handler.metadata?.capabilities) {
            existing.metadata = existing.metadata || {}
            existing.metadata.capabilities = Array.from(new Set([
              ...(existing.metadata.capabilities || []),
              ...handler.metadata.capabilities
            ]))
          }
        } else {
          handlerTypes.set(type, {
            id: type,
            label: getHandlerLabel(type),
            description: getHandlerDescription(type),
            metadata: {
              icon: getHandlerIcon(type),
              category: getHandlerCategory(type),
              capabilities: handler.metadata?.capabilities || []
            },
            count: 1
          })
        }
      })
    })

    // Konvertiere die Map in ein Array und sortiere nach Häufigkeit
    const sortedTypes = Array.from(handlerTypes.values())
      .sort((a, b) => b.count - a.count)
      .map(({ count, ...type }) => type)

    return NextResponse.json({ types: sortedTypes })
  } catch (error) {
    console.error('Fehler beim Laden der Handler-Typen:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Handler-Typen' },
      { status: 500 }
    )
  }
}

// Hilfsfunktionen für die Anzeige
function getHandlerLabel(type: string): string {
  const typeMap: Record<string, string> = {
    'default': 'Standard-Handler',
    'service': 'Service-Handler',
    'product': 'Produkt-Handler',
    'article': 'Artikel-Handler',
    'faq': 'FAQ-Handler',
    'contact': 'Kontakt-Handler',
    'event': 'Event-Handler',
    'download': 'Download-Handler',
    'video': 'Video-Handler',
    'image': 'Bild-Handler',
    'form': 'Formular-Handler',
    'profile': 'Profil-Handler',
    'location': 'Standort-Handler',
    'text': 'Text-Handler',
    'tutorial': 'Tutorial-Handler',
    'document': 'Dokument-Handler'
  }
  return typeMap[type.toLowerCase()] || type
}

function getHandlerDescription(type: string): string {
  const descriptionMap: Record<string, string> = {
    'default': 'Standard-Handler für allgemeine Inhalte',
    'service': 'Verarbeitet Service- und Dienstleistungsinformationen',
    'product': 'Spezialisiert auf Produktinformationen und -kataloge',
    'article': 'Verarbeitet Artikel und redaktionelle Inhalte',
    'faq': 'Verwaltet häufig gestellte Fragen und Antworten',
    'contact': 'Verarbeitet Kontakt- und Ansprechpartnerinformationen',
    'event': 'Spezialisiert auf Veranstaltungen und Termine',
    'download': 'Verwaltet Download-Ressourcen und Dokumente',
    'video': 'Verarbeitet Video-Inhalte und Multimedia',
    'image': 'Spezialisiert auf Bilder und Grafiken',
    'form': 'Verwaltet Formulare und Eingabemasken',
    'profile': 'Verarbeitet Profil- und Personendaten',
    'location': 'Spezialisiert auf Standort- und Ortsinformationen',
    'text': 'Verarbeitet allgemeine Textinhalte',
    'tutorial': 'Spezialisiert auf Anleitungen und Tutorials',
    'document': 'Verwaltet Dokumente und Dokumentationen'
  }
  return descriptionMap[type.toLowerCase()] || ''
}

function getHandlerIcon(type: string): string {
  const iconMap: Record<string, string> = {
    'default': 'file-text',
    'service': 'briefcase',
    'product': 'shopping-bag',
    'article': 'book-open',
    'faq': 'help-circle',
    'contact': 'users',
    'event': 'calendar',
    'download': 'download',
    'video': 'video',
    'image': 'image',
    'form': 'clipboard',
    'profile': 'user',
    'location': 'map-pin',
    'text': 'file-text',
    'tutorial': 'book',
    'document': 'file'
  }
  return iconMap[type.toLowerCase()] || 'file-text'
}

function getHandlerCategory(type: string): string {
  const categoryMap: Record<string, string> = {
    'default': 'Allgemein',
    'service': 'Services',
    'product': 'Produkte',
    'article': 'Inhalte',
    'faq': 'Support',
    'contact': 'Kontakte',
    'event': 'Events',
    'download': 'Downloads',
    'video': 'Multimedia',
    'image': 'Multimedia',
    'form': 'Interaktion',
    'profile': 'Profile',
    'location': 'Standorte',
    'text': 'Inhalte',
    'tutorial': 'Support',
    'document': 'Dokumente'
  }
  return categoryMap[type.toLowerCase()] || 'Sonstige'
} 