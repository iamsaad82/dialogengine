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
    const meta = template.jsonMeta ? JSON.parse(template.jsonMeta) : null
    return {
      title: meta?.title || template.name,
      description: meta?.description || `${template.name} - Powered by Dialog Engine`
    }
  } catch (error) {
    console.error('Fehler beim Parsen der Metadaten:', error)
    return {
      title: template.name,
      description: `${template.name} - Powered by Dialog Engine`
    }
  }
}

export default async function SubdomainPage({ params }: Props) {
  try {
    const template = await getTemplateBySubdomain(params.subdomain)
    
    if (!template) {
      notFound()
    }

    const content = template.jsonContent ? JSON.parse(template.jsonContent) : {}
    const branding = template.jsonBranding ? JSON.parse(template.jsonBranding) : {}
    
    // Stelle sicher, dass die Mindestanforderungen erfüllt sind
    if (!content || !branding) {
      console.error('Template Konfigurationsfehler:', { 
        hasContent: !!content, 
        hasBranding: !!branding,
        templateId: template.id 
      })
      
      // Verwende Fallback-Werte
      return (
        <div className="container mx-auto p-4">
          <h1 className="text-2xl font-bold mb-4">
            {content?.hero?.title || 'Willkommen'}
          </h1>
          <p className="text-gray-600">
            {content?.hero?.description || 'Diese Seite wird gerade konfiguriert.'}
          </p>
        </div>
      )
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
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          Ein Fehler ist aufgetreten
        </h1>
        <p className="text-gray-600">
          Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.
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