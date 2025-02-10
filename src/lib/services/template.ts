import { prisma } from '@/lib/prisma'
import { TemplateTypeEnum, Template } from '@/lib/types/template'

export async function getTemplateBySubdomain(subdomain: string): Promise<Template | null> {
  // Ignoriere Systemdateien
  const systemFiles = ['robots.txt', 'sitemap.xml', 'favicon.ico']
  if (systemFiles.includes(subdomain.toLowerCase())) {
    return null
  }

  // Bereinige die Subdomain
  const cleanSubdomain = subdomain.toLowerCase().trim()
  console.log('Suche Template für Subdomain:', cleanSubdomain)
  
  // Suche das Template
  const template = await prisma.template.findFirst({
    where: {
      subdomain: cleanSubdomain,
      active: true
    },
    include: {
      flowiseConfig: true
    }
  })

  if (!template) {
    console.log('Kein Template gefunden für:', cleanSubdomain)
    return null
  }

  console.log('Gefundenes Template:', template)

  // Validate template type
  if (!Object.values(TemplateTypeEnum).includes(template.type as any)) {
    console.error('Ungültiger Template-Typ:', template.type)
    return null
  }

  try {
    // Map template to frontend structure
    return {
      id: template.id,
      name: template.name,
      type: template.type as TemplateType,
      active: template.active,
      subdomain: template.subdomain,
      jsonContent: template.jsonContent,
      jsonBranding: template.jsonBranding,
      jsonBot: template.jsonBot,
      jsonMeta: template.jsonMeta,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      flowiseConfig: template.flowiseConfig,
      flowiseConfigId: template.flowiseConfigId
    }
  } catch (error) {
    console.error('Fehler beim Mapping des Templates:', error)
    return null
  }
} 