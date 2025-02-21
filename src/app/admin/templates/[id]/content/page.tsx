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
    description: 'Beschreibung hier einfügen',
    image: '/images/default-hero.jpg'
  },
  showcase: {
    title: 'Unsere Leistungen',
    image: '/images/showcase.jpg',
    altText: 'Showcase Bild',
    context: {
      title: 'Showcase Titel',
      description: 'Showcase Beschreibung'
    },
    cta: {
      title: 'Haben Sie Fragen?',
      hint: 'Wir sind für Sie da',
      question: 'Wie können wir Ihnen helfen?'
    },
    items: [
      {
        title: 'Leistung 1',
        description: 'Beschreibung der Leistung 1',
        image: '/images/service1.jpg'
      },
      {
        title: 'Leistung 2',
        description: 'Beschreibung der Leistung 2',
        image: '/images/service2.jpg'
      }
    ]
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
    email: 'kontakt@example.com',
    phone: '+49 123 456789',
    address: 'Musterstraße 1, 12345 Stadt',
    buttonText: 'Kontakt aufnehmen'
  },
  dialog: {
    title: 'Chat',
    description: 'Wie können wir Ihnen helfen?',
    examples: [
      {
        question: 'Was sind Ihre Öffnungszeiten?',
        answer: 'Wir sind rund um die Uhr für Sie da.'
      },
      {
        question: 'Wie kann ich Sie erreichen?',
        answer: 'Sie können uns per E-Mail oder Telefon kontaktieren.'
      }
    ]
  },
  examples: []
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
        hero: sections.hero || createDefaultContent().hero,
        showcase: sections.showcase || createDefaultContent().showcase,
        features: sections.features || createDefaultContent().features,
        contact: sections.contact || createDefaultContent().contact,
        dialog: sections.dialog || createDefaultContent().dialog,
        examples: sections.examples || []
      }
      
      setContent(parsedContent)
      setLocalContent(parsedContent)
    } catch (error) {
      console.error('Fehler beim Laden der Inhalte:', error)
      toast({
        title: 'Fehler',
        description: 'Die Inhalte konnten nicht geladen werden.'
      })
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