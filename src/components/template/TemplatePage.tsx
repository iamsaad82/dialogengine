import { Template, ParsedContent, ParsedBranding } from '@/lib/types/template'
import { ChatbotLandingPage } from '@/components/ChatbotLandingPage'

interface TemplatePageProps {
  content: {
    sections: Array<{
      id: string
      type: string
      content: any
    }>
    metadata: Record<string, any>
  }
  branding: {
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
  template: Template
}

export function TemplatePage({ content, branding, template }: TemplatePageProps) {
  // Konvertiere die Sections in das ParsedContent Format
  const parsedContent: ParsedContent = {
    hero: content.sections.find(s => s.id === 'hero')?.content || {},
    showcase: content.sections.find(s => s.id === 'showcase')?.content || {},
    features: content.sections.find(s => s.id === 'features')?.content?.features || [],
    contact: content.sections.find(s => s.id === 'contact')?.content || {},
    dialog: content.sections.find(s => s.id === 'dialog')?.content || {}
  }

  // Konvertiere das Branding in das ParsedBranding Format
  const parsedBranding: ParsedBranding = {
    primaryColor: branding.colors.primary,
    secondaryColor: branding.colors.secondary,
    backgroundColor: branding.colors.accent,
    textColor: '#000000',
    logo: branding.logo,
    font: branding.fonts.body
  }

  // Erstelle eine neue Template-Instanz mit den korrekten Daten
  const templateWithJson = {
    ...template,
    jsonContent: parsedContent,
    jsonBranding: parsedBranding
  } as Template & {
    jsonContent: ParsedContent
    jsonBranding: ParsedBranding
  }

  return (
    <main className="min-h-screen">
      <ChatbotLandingPage template={templateWithJson} />
    </main>
  )
} 