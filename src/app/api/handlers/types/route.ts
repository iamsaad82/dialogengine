import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

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

    // Extrahiere und gruppiere die Handler-Typen
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

    // Sammle alle Handler-Typen
    templates.forEach(template => {
      const handlers = template.handlers as PrismaHandler[]
      if (!Array.isArray(handlers)) return

      handlers.forEach(handler => {
        if (!handler.type) return

        const type = handler.type
        const existing = handlerTypes.get(type)

        if (existing) {
          existing.count++
          // Füge neue Capabilities hinzu
          if (handler.metadata?.capabilities) {
            existing.metadata = existing.metadata || {}
            existing.metadata.capabilities = [
              ...(existing.metadata.capabilities || []),
              ...handler.metadata.capabilities
            ]
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
      .map(({ count, ...type }) => type) // Entferne count aus der Ausgabe

    return NextResponse.json(sortedTypes)
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
    'medical': 'Medizinischer Handler',
    'insurance': 'Versicherungs-Handler',
    'city-administration': 'Verwaltungs-Handler',
    'shopping-center': 'Shopping-Handler',
    'default': 'Standard-Handler'
  }
  return typeMap[type] || type
}

function getHandlerDescription(type: string): string {
  const descriptionMap: Record<string, string> = {
    'medical': 'Spezialisiert auf medizinische Anfragen und Gesundheitsinformationen',
    'insurance': 'Verarbeitet Versicherungsanfragen und -informationen',
    'city-administration': 'Unterstützt bei Verwaltungsanfragen und Bürgerdiensten',
    'shopping-center': 'Hilft bei Shopping- und Produktanfragen',
    'default': 'Allgemeiner Handler für verschiedene Anfragen'
  }
  return descriptionMap[type] || ''
}

function getHandlerIcon(type: string): string {
  const iconMap: Record<string, string> = {
    'medical': 'stethoscope',
    'insurance': 'shield',
    'city-administration': 'building',
    'shopping-center': 'shopping-cart',
    'default': 'bot'
  }
  return iconMap[type] || 'bot'
}

function getHandlerCategory(type: string): string {
  const categoryMap: Record<string, string> = {
    'medical': 'Gesundheit',
    'insurance': 'Versicherung',
    'city-administration': 'Verwaltung',
    'shopping-center': 'Shopping',
    'default': 'Allgemein'
  }
  return categoryMap[type] || 'Sonstige'
} 