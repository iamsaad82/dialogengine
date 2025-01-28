import { ChatbotLandingPage } from '@/components/ChatbotLandingPage'
import { Template } from '@/lib/types/template'
import { templateTypeSchema } from '@/lib/schemas/template'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

interface Props {
  params: {
    subdomain: string
  }
}

export default async function SubdomainPage({ params }: Props) {
  try {
    // Bereinige die Subdomain und entferne Sonderzeichen
    const cleanSubdomain = params.subdomain.toLowerCase().trim()
    console.log('Suche Template für Subdomain:', cleanSubdomain)
    
    // Suche das Template in der Datenbank
    const template = await prisma.template.findFirst({
      where: {
        subdomain: cleanSubdomain,
        active: true // Nur aktive Templates
      }
    })

    // Log das gefundene Template
    if (template) {
      console.log('Gefundenes Template:', template)
    } else {
      console.log('Kein Template gefunden für:', cleanSubdomain)
      return notFound()
    }

    // Validate template type
    const templateType = templateTypeSchema.parse(template.type)
    console.log("Template-Typ validiert:", templateType)

    // Parse JSON fields
    try {
      const content = typeof template.jsonContent === 'string' ? JSON.parse(template.jsonContent) : template.jsonContent;
      const branding = typeof template.jsonBranding === 'string' ? JSON.parse(template.jsonBranding) : template.jsonBranding;
      const bot = typeof template.jsonBot === 'string' ? JSON.parse(template.jsonBot) : template.jsonBot;
      const meta = typeof template.jsonMeta === 'string' ? JSON.parse(template.jsonMeta) : template.jsonMeta;

      // Map template to frontend structure
      const mappedTemplate: Template = {
        id: template.id,
        name: template.name,
        type: templateType,
        active: template.active,
        subdomain: template.subdomain,
        jsonContent: content,
        jsonBranding: branding,
        jsonBot: bot,
        jsonMeta: meta,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        flowiseConfig: template.flowiseConfig,
        flowiseConfigId: template.flowiseConfigId
      }

      console.log("Template erfolgreich gemappt")
      
      return <ChatbotLandingPage template={mappedTemplate} />
    } catch (error) {
      console.error("Fehler beim Parsen der JSON-Felder:", error)
      notFound()
    }
  } catch (error) {
    console.error('Fehler beim Laden des Templates:', error)
    return notFound()
  }
} 