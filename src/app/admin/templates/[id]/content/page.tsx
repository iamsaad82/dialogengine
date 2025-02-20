'use client'

import { ContentEditor } from "@/components/admin/template/ContentEditor"
import { PageHeader } from "@/components/admin/PageHeader"
import { useEffect, useState } from "react"
import { ParsedContent } from "@/lib/types/template"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

type Section = {
  id: string;
  type: string;
  content: any;
}

const createDefaultContent = (): ParsedContent => ({
  hero: {
    title: 'Willkommen',
    subtitle: 'Untertitel hier einfügen',
    description: 'Beschreibung hier einfügen'
  },
  showcase: {
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
  },
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
  ],
  contact: {
    title: 'Kontakt',
    description: 'Kontaktieren Sie uns',
    email: '',
    buttonText: 'Kontakt aufnehmen'
  },
  dialog: {
    title: 'Chat',
    description: 'Wie können wir Ihnen helfen?'
  }
})

export default function ContentPage({ params }: { params: { id: string } }) {
  const [content, setContent] = useState<ParsedContent>(createDefaultContent())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [localContent, setLocalContent] = useState<ParsedContent | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadContent()
  }, [params.id])

  const loadContent = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/templates/${params.id}`)
      
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Inhalte')
      }
      
      const data = await response.json()
      
      if (!data.content?.sections) {
        console.warn('Keine Sections gefunden, verwende Default-Content')
        setContent(createDefaultContent())
        setLocalContent(createDefaultContent())
        return
      }
      
      // Konvertiere das Datenformat
      const sections = data.content.sections
      const parsedContent: ParsedContent = {
        hero: sections.find((s: Section) => s.id === 'hero')?.content || createDefaultContent().hero,
        showcase: sections.find((s: Section) => s.id === 'showcase')?.content || createDefaultContent().showcase,
        features: sections.find((s: Section) => s.id === 'features')?.content?.features || createDefaultContent().features,
        contact: sections.find((s: Section) => s.id === 'contact')?.content || createDefaultContent().contact,
        dialog: sections.find((s: Section) => s.id === 'dialog')?.content || createDefaultContent().dialog
      }
      
      setContent(parsedContent)
      setLocalContent(parsedContent)
    } catch (error) {
      console.error('Fehler beim Laden der Inhalte:', error)
      toast({
        title: "Fehler",
        description: "Die Inhalte konnten nicht geladen werden."
      })
      // Setze Default-Content im Fehlerfall
      setContent(createDefaultContent())
      setLocalContent(createDefaultContent())
    } finally {
      setLoading(false)
    }
  }

  const handleContentChange = (updatedContent: ParsedContent) => {
    // Aktualisiere nur den lokalen State
    setLocalContent(updatedContent)
  }

  const handleSave = async () => {
    if (!localContent) return

    try {
      setSaving(true)
      
      // Hole zuerst das aktuelle Template
      const getResponse = await fetch(`/api/templates/${params.id}`)
      const currentTemplate = await getResponse.json()
      
      if (!getResponse.ok) {
        throw new Error('Fehler beim Laden des Templates')
      }

      // Bereite die Update-Daten vor
      const updateData = {
        ...currentTemplate,
        content: {
          sections: [
            {
              id: 'hero',
              type: 'hero',
              content: localContent.hero
            },
            {
              id: 'showcase',
              type: 'showcase',
              content: localContent.showcase
            },
            {
              id: 'features',
              type: 'features',
              content: { features: localContent.features }
            },
            {
              id: 'contact',
              type: 'contact',
              content: localContent.contact
            },
            {
              id: 'dialog',
              type: 'dialog',
              content: localContent.dialog
            }
          ],
          metadata: currentTemplate.content?.metadata || {}
        }
      }

      // Sende Update-Request
      const response = await fetch(`/api/templates/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })
      
      if (!response.ok) {
        throw new Error('Fehler beim Speichern der Inhalte')
      }
      
      // Aktualisiere den Haupt-State nach erfolgreichem Speichern
      setContent(localContent)
      
      toast({
        title: "Erfolg",
        description: "Die Änderungen wurden gespeichert."
      })
    } catch (error) {
      console.error('Fehler beim Speichern der Inhalte:', error)
      toast({
        title: "Fehler",
        description: "Die Änderungen konnten nicht gespeichert werden."
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div>Lädt...</div>
  }

  const hasUnsavedChanges = JSON.stringify(content) !== JSON.stringify(localContent)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader
          title="Inhalte"
          description="Verwalten Sie die Inhalte Ihres Templates."
        />
        <Button 
          onClick={handleSave}
          disabled={saving || !hasUnsavedChanges}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Wird gespeichert...
            </>
          ) : (
            'Änderungen speichern'
          )}
        </Button>
      </div>
      
      <div className="container mx-auto py-6">
        <div className="bg-white rounded-lg border p-6">
          <ContentEditor 
            content={localContent || createDefaultContent()}
            onChange={handleContentChange}
          />
        </div>
      </div>
    </div>
  )
} 