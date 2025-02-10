'use client'

import { ContentEditor } from "@/components/admin/template/ContentEditor"
import { PageHeader } from "@/components/admin/PageHeader"
import { useEffect, useState } from "react"
import { ParsedContent } from "@/lib/types/template"

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
    }
  },
  features: [],
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

  useEffect(() => {
    loadContent()
  }, [params.id])

  const loadContent = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/templates/${params.id}/content`)
      
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Inhalte')
      }
      
      const data = await response.json()
      setContent(data.content || createDefaultContent())
    } catch (error) {
      console.error('Fehler beim Laden der Inhalte:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleContentChange = async (updatedContent: ParsedContent) => {
    try {
      const response = await fetch(`/api/templates/${params.id}/content`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: updatedContent }),
      })
      
      if (!response.ok) {
        throw new Error('Fehler beim Speichern der Inhalte')
      }
      
      setContent(updatedContent)
    } catch (error) {
      console.error('Fehler beim Speichern der Inhalte:', error)
    }
  }

  if (loading) {
    return <div>Lädt...</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inhalte"
        description="Verwalten Sie die Inhalte Ihres Templates."
      />
      
      <div className="container mx-auto py-6">
        <div className="bg-white rounded-lg border p-6">
          <ContentEditor 
            content={content}
            onChange={handleContentChange}
          />
        </div>
      </div>
    </div>
  )
} 