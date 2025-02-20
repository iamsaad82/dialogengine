'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { ResponseTypeManager } from '@/components/admin/template/content/ResponseTypeManager'
import type { Template } from '@/lib/schemas/template'

interface ContentTypesPageProps {
  params: {
    id: string
  }
}

export default function ContentTypesPage({ params }: ContentTypesPageProps) {
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadTemplate()
  }, [params.id])

  const loadTemplate = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/templates/${params.id}`)
      
      if (!response.ok) {
        throw new Error('Fehler beim Laden des Templates')
      }
      
      const data = await response.json()
      setTemplate(data)
    } catch (error) {
      console.error('Fehler beim Laden des Templates:', error)
      toast({
        title: 'Fehler',
        description: 'Das Template konnte nicht geladen werden.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateUpdate = async (updatedTemplate: Template) => {
    try {
      const response = await fetch(`/api/templates/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTemplate),
      })
      
      if (!response.ok) {
        throw new Error('Fehler beim Speichern des Templates')
      }
      
      setTemplate(updatedTemplate)
      toast({
        title: 'Erfolg',
        description: 'Die Antwortformate wurden gespeichert.'
      })
    } catch (error) {
      console.error('Fehler beim Speichern des Templates:', error)
      toast({
        title: 'Fehler',
        description: 'Die Antwortformate konnten nicht gespeichert werden.'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Template nicht gefunden
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Antwortformate"
        description="Verwalten Sie hier die Formate für die Chatbot-Antworten."
      />
      
      <div className="container mx-auto py-6">
        <div className="bg-white rounded-lg border p-6">
          <ResponseTypeManager 
            template={template} 
            onUpdate={handleTemplateUpdate}
          />
        </div>
      </div>
    </div>
  )
} 