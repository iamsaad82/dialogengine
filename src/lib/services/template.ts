import { prisma } from '@/lib/prisma'
import { TemplateTypeEnum, Template, TemplateType } from '@/lib/types/template'

type SectionType = 'hero' | 'features' | 'showcase' | 'contact' | 'custom'

interface Section {
  id: string
  type: SectionType
  content: Record<string, any>
  style?: Record<string, any>
  metadata?: Record<string, any>
}

const createDefaultSections = (): Section[] => [
  {
    id: 'hero',
    type: 'hero',
    content: {
      title: 'Willkommen',
      subtitle: 'Untertitel hier einfügen',
      description: 'Beschreibung hier einfügen'
    }
  },
  {
    id: 'showcase',
    type: 'showcase',
    content: {
      image: '',
      altText: '',
      context: {
        title: 'Showcase Titel',
        description: 'Showcase Beschreibung'
      },
      cta: {
        title: 'Haben Sie Fragen?',
        question: 'Wie können wir Ihnen helfen?'
      },
      contact: {
        text: 'Sprechen Sie mit uns',
        type: 'email',
        value: ''
      }
    }
  },
  {
    id: 'features',
    type: 'features',
    content: {
      features: [
        {
          icon: 'zap',
          title: 'Schnell & Effizient',
          description: 'Optimierte Prozesse für maximale Effizienz'
        },
        {
          icon: 'brain',
          title: 'Intelligent & Adaptiv',
          description: 'Lernt kontinuierlich aus Interaktionen'
        },
        {
          icon: 'clock',
          title: '24/7 Verfügbar',
          description: 'Rund um die Uhr für Sie da'
        }
      ]
    }
  }
]

export async function getTemplateBySubdomain(subdomain: string): Promise<Template | null> {
  try {
    // Prüfe auf System-Dateien
    if (subdomain.startsWith('.')) {
      return null
    }

    // Bereinige Subdomain
    const cleanSubdomain = subdomain.toLowerCase().trim()
    console.log('Suche Template für Subdomain:', cleanSubdomain)

    // Hole Template aus der Datenbank
    const template = await prisma.template.findFirst({
      where: {
        subdomain: cleanSubdomain,
        active: true
      }
    })

    if (!template) {
      console.log('Kein Template gefunden für Subdomain:', cleanSubdomain)
      return null
    }

    console.log('Gefundenes Template:', template)

    // Stelle sicher, dass die Subdomain nicht null ist
    if (!template.subdomain) {
      console.warn('Template hat keine Subdomain:', {
        id: template.id
      })
      return null
    }

    // Parse JSON Felder
    try {
      const content = template.content as {
        sections: Array<{
          id: string
          type: 'hero' | 'features' | 'showcase' | 'contact' | 'custom'
          content: Record<string, any>
          style?: Record<string, any>
          metadata?: Record<string, any>
        }>
        metadata: Record<string, any>
      }

      const branding = template.branding as {
        logo: string
        colors: {
          primary: string
          secondary: string
          accent: string
        }
        fonts: {
          heading: string
          body: string
        }
      }

      // Stelle sicher dass die Grundstruktur vorhanden ist
      if (!content.sections) {
        content.sections = createDefaultSections()
      } else {
        // Prüfe ob alle erforderlichen Sections vorhanden sind
        const requiredSections = ['hero', 'showcase', 'features']
        const existingSectionIds = content.sections.map(s => s.id)
        const missingSections = requiredSections.filter(id => !existingSectionIds.includes(id))

        if (missingSections.length > 0) {
          console.log('Fehlende Sections werden hinzugefügt:', missingSections)
          const defaultSections = createDefaultSections()
          missingSections.forEach(id => {
            const defaultSection = defaultSections.find(s => s.id === id)
            if (defaultSection) {
              content.sections.push(defaultSection)
            }
          })
        }
      }
      if (!content.metadata) {
        content.metadata = {}
      }

      return {
        id: template.id,
        name: template.name,
        type: template.type as TemplateType,
        active: template.active,
        subdomain: template.subdomain,
        description: template.description || '',
        config: template.config as any || {
          examples: [],
          flowiseId: template.flowiseConfigId || undefined,
          smartSearch: undefined
        },
        handlers: template.handlers as any || [],
        responses: template.responses as any || {
          templates: [],
          rules: []
        },
        content,
        branding,
        meta: template.meta as any || {
          title: template.name,
          description: template.description || '',
          keywords: [],
          author: '',
          image: '',
          url: `https://${template.subdomain}.dialogengine.de`
        },
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        flowiseConfigId: template.flowiseConfigId,
        flowiseConfig: null
      }
    } catch (error) {
      console.error('Fehler beim Parsen der Template-Daten:', error)
      return null
    }
  } catch (error) {
    console.error('Fehler beim Laden des Templates:', error)
    return null
  }
} 