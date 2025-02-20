import { ChatbotLandingPage } from '@/components/ChatbotLandingPage'
import { Template } from '@/lib/types/template'
import { templateTypeSchema } from '@/lib/schemas/template'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Metadata } from 'next'
import { getTemplateBySubdomain } from '@/lib/services/template'
import { TemplatePage } from '@/components/template/TemplatePage'

interface Props {
  params: {
    subdomain: string
  }
}

interface TemplateMeta {
  title?: string
  description?: string
  [key: string]: any
}

export async function generateMetadata({ params }: { params: { subdomain: string } }): Promise<Metadata> {
  const template = await prisma.template.findFirst({
    where: {
      subdomain: params.subdomain.toLowerCase().trim(),
      active: true
    }
  })

  if (!template) {
    return {
      title: 'Dialog Engine',
      description: 'A powerful chatbot engine'
    }
  }

  try {
    const meta = template.meta as TemplateMeta || {}
    return {
      title: meta.title || template.name,
      description: meta.description || `${template.name} - Powered by Dialog Engine`
    }
  } catch (error) {
    console.error('Fehler beim Parsen der Metadaten:', error)
    return {
      title: template.name,
      description: `${template.name} - Powered by Dialog Engine`
    }
  }
}

const DEFAULT_BRANDING = {
  logo: '',
  colors: {
    primary: '#000000',
    secondary: '#666666',
    accent: '#CCCCCC'
  },
  fonts: {
    heading: 'Inter',
    body: 'Inter'
  }
}

const DEFAULT_CONTENT = {
  metadata: {},
  sections: [
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
        }
      }
    }
  ]
}

export default async function SubdomainPage({ params }: Props) {
  try {
    console.log('Lade Template für Subdomain:', params.subdomain)
    const template = await getTemplateBySubdomain(params.subdomain)
    
    if (!template) {
      console.log('Kein Template gefunden für:', params.subdomain)
      notFound()
    }

    // Verwende Standardwerte, wenn content oder branding fehlen
    const content = template.content || DEFAULT_CONTENT
    const branding = template.branding || DEFAULT_BRANDING

    // Protokolliere Warnung, aber verhindere keinen Render
    if (!template.content?.sections || !template.branding) {
      console.warn('Template verwendet Standardwerte:', {
        hasContent: !!template.content?.sections,
        hasBranding: !!template.branding,
        templateId: template.id
      })
    }

    return (
      <TemplatePage 
        content={content}
        branding={branding}
        template={template}
      />
    )
  } catch (error) {
    console.error('Fehler beim Laden des Templates:', error)
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">
          Ein Fehler ist aufgetreten
        </h1>
        <p className="text-gray-600">
          Das Template konnte nicht geladen werden. Bitte versuchen Sie es später erneut.
        </p>
      </div>
    )
  }
}

function parseJsonField(jsonString: string | null, fieldName: string) {
  if (!jsonString) {
    console.warn(`Leeres ${fieldName}-Feld gefunden`)
    return null
  }

  try {
    // Prüfe ob der String bereits ein JSON-Objekt ist
    if (typeof jsonString === 'object') {
      return jsonString
    }
    
    // Entferne zusätzliche Anführungszeichen falls vorhanden
    const cleanString = jsonString.startsWith('"') && jsonString.endsWith('"')
      ? JSON.parse(jsonString)  // Entferne äußere Anführungszeichen
      : jsonString

    // Parse den bereinigten String
    return JSON.parse(cleanString)
  } catch (error) {
    console.error(`Fehler beim Parsen des ${fieldName}-Feldes:`, error)
    console.error('Problematischer String:', jsonString)
    return null
  }
} 