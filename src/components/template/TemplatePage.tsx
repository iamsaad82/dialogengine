import { Template, ParsedContent, ParsedBranding } from '@/lib/types/template'
import { ChatbotLandingPage } from '@/components/ChatbotLandingPage'

interface TemplatePageProps {
  content: ParsedContent
  branding: ParsedBranding
  template: Template
}

export function TemplatePage({ content, branding, template }: TemplatePageProps) {
  // Konvertiere die Objekte zu JSON-Strings für die ChatbotLandingPage
  const templateWithJson: Template = {
    ...template,
    jsonContent: JSON.stringify(content),
    jsonBranding: JSON.stringify(branding)
  }

  return (
    <main className="min-h-screen">
      <ChatbotLandingPage template={templateWithJson} />
    </main>
  )
} 