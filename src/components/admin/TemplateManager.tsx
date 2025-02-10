'use client'

import React, { useState, useEffect } from 'react'
import type { Template } from '@/lib/types/template'
import TemplateEditor from './TemplateEditor'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import FlowiseConfig from './FlowiseConfig'
import { useToast } from '@/components/ui/use-toast'
import ContentTypeManager from './ContentTypeManager'
import { useRouter } from 'next/navigation'
import { PlusIcon } from '@radix-ui/react-icons'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const defaultTemplate: Template = {
  id: '',
  name: 'Demo Template',
  type: 'NEUTRAL',
  active: true,
  subdomain: null,
  jsonContent: JSON.stringify({
    hero: {
      title: 'Willkommen zur Demo',
      subtitle: 'Testen Sie unseren KI-Chatbot',
      description: 'Eine leistungsstarke Lösung für Ihre Website'
    },
    dialog: {
      title: 'Wie kann ich helfen?',
      description: 'Ich beantworte gerne Ihre Fragen'
    }
  }),
  jsonBranding: JSON.stringify({
    logo: '',
    primaryColor: '#4F46E5',
    secondaryColor: '#7C3AED',
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    font: 'Inter'
  }),
  jsonBot: JSON.stringify({
    type: 'examples',
    examples: []
  }),
  jsonMeta: JSON.stringify({
    title: '',
    description: '',
    domain: '',
    contactUrl: '/kontakt',
    servicesUrl: '/leistungen'
  }),
  createdAt: new Date(),
  updatedAt: new Date()
}

const parseTemplate = (template: Template): Template => {
  return {
    ...template,
    jsonContent: typeof template.jsonContent === 'string' ? template.jsonContent : JSON.stringify(template.jsonContent),
    jsonBranding: typeof template.jsonBranding === 'string' ? template.jsonBranding : JSON.stringify(template.jsonBranding),
    jsonBot: typeof template.jsonBot === 'string' ? template.jsonBot : JSON.stringify(template.jsonBot),
    jsonMeta: typeof template.jsonMeta === 'string' ? template.jsonMeta : JSON.stringify(template.jsonMeta),
  }
}

export default function TemplateManager() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Load templates on mount
  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/templates')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      
      // Parse templates when loading
      const parsedTemplates = data.map((template: Template) => {
        try {
          return {
            ...template,
            jsonContent: typeof template.jsonContent === 'string' ? JSON.parse(template.jsonContent) : template.jsonContent,
            jsonBranding: typeof template.jsonBranding === 'string' ? JSON.parse(template.jsonBranding) : template.jsonBranding,
            jsonBot: typeof template.jsonBot === 'string' ? JSON.parse(template.jsonBot) : template.jsonBot,
            jsonMeta: typeof template.jsonMeta === 'string' ? JSON.parse(template.jsonMeta) : template.jsonMeta
          }
        } catch (parseError) {
          console.error('Fehler beim Parsen des Templates:', parseError)
          return template
        }
      })
      
      setTemplates(parsedTemplates)
    } catch (err) {
      console.error('Fehler beim Laden der Templates:', err)
      setError('Fehler beim Laden der Templates. Bitte versuchen Sie es später erneut.')
      toast({
        title: 'Fehler',
        description: 'Templates konnten nicht geladen werden.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (template: Template) => {
    try {
      const templateToSave = {
        ...template,
        jsonContent: typeof template.jsonContent === 'string' ? template.jsonContent : JSON.stringify(template.jsonContent),
        jsonBranding: typeof template.jsonBranding === 'string' ? template.jsonBranding : JSON.stringify(template.jsonBranding),
        jsonBot: typeof template.jsonBot === 'string' ? template.jsonBot : JSON.stringify(template.jsonBot),
        jsonMeta: typeof template.jsonMeta === 'string' ? template.jsonMeta : JSON.stringify(template.jsonMeta)
      }

      const response = await fetch('/api/templates', {
        method: template.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateToSave),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const savedTemplate = await response.json()
      console.log('Gespeichertes Template:', savedTemplate)
      
      // Parse the saved template before updating state
      const parsedTemplate = {
        ...savedTemplate,
        jsonContent: typeof savedTemplate.jsonContent === 'string' ? JSON.parse(savedTemplate.jsonContent) : savedTemplate.jsonContent,
        jsonBranding: typeof savedTemplate.jsonBranding === 'string' ? JSON.parse(savedTemplate.jsonBranding) : savedTemplate.jsonBranding,
        jsonBot: typeof savedTemplate.jsonBot === 'string' ? JSON.parse(savedTemplate.jsonBot) : savedTemplate.jsonBot,
        jsonMeta: typeof savedTemplate.jsonMeta === 'string' ? JSON.parse(savedTemplate.jsonMeta) : savedTemplate.jsonMeta
      }
      
      // Update templates list
      setTemplates(prevTemplates => {
        const newTemplates = [...prevTemplates]
        const index = newTemplates.findIndex(t => t.id === template.id)
        if (index !== -1) {
          newTemplates[index] = parsedTemplate
        } else {
          newTemplates.push(parsedTemplate)
        }
        return newTemplates
      })

      setEditingTemplate(null)
      toast({
        title: 'Erfolg',
        description: 'Template wurde gespeichert.'
      })
    } catch (err) {
      console.error('Fehler beim Speichern:', err)
      toast({
        title: 'Fehler',
        description: 'Template konnte nicht gespeichert werden.'
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to delete template')
      
      // Reload templates after delete
      await fetchTemplates()
      toast({
        title: 'Erfolg',
        description: 'Template wurde gelöscht.'
      })
    } catch (error) {
      console.error('Error deleting template:', error)
      toast({
        title: 'Fehler',
        description: 'Template konnte nicht gelöscht werden.'
      })
    }
  }

  const createTemplate = async () => {
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Neues Template',
          description: 'Beschreibung des neuen Templates',
        }),
      })
      const newTemplate = await response.json()
      router.push(`/admin/templates/${newTemplate.id}/content`)
    } catch (error) {
      console.error('Fehler beim Erstellen des Templates:', error)
    }
  }

  // Render loading state only when actually loading and no templates are available
  if (loading && templates.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        {error}
        <button 
          onClick={fetchTemplates}
          className="ml-4 text-sm underline hover:no-underline"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  // Wenn ein Template bearbeitet wird
  if (editingTemplate) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Template {editingTemplate.id ? 'bearbeiten' : 'erstellen'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Bearbeiten Sie die Einstellungen des Templates.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setEditingTemplate(null)}
          >
            Zurück zur Übersicht
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow">
          <TemplateEditor
            template={editingTemplate}
            onSave={async (template) => {
              await handleSave(template)
              setEditingTemplate(null)
            }}
            onCancel={() => setEditingTemplate(null)}
          />
        </div>
      </div>
    )
  }

  // Template-Übersicht
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={createTemplate}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Neues Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Keine Templates vorhanden. Erstellen Sie ein neues Template, um loszulegen.
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => router.push(`/admin/templates/${template.id}/content`)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{template.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {template.type === 'NEUTRAL' ? 'Neutrales Template' : 
                     template.type === 'INDUSTRY' ? 'Branchen-Template' : 
                     'Individuelles Template'}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  Zuletzt bearbeitet: {new Date(template.updatedAt).toLocaleDateString('de-DE')}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 