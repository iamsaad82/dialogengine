'use client'

import React, { useState, useEffect } from 'react'
import { Template } from '@/lib/types/template'
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

const defaultTemplate: Template = {
  id: '',
  name: 'Demo Template',
  type: 'NEUTRAL',
  active: true,
  subdomain: '',
  jsonContent: '',
  jsonBranding: '',
  jsonBot: '',
  jsonMeta: '',
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
  const [templates, setTemplates] = useState<Template[]>([])
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(false)
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

  // Render loading state only when actually loading and no templates are available
  if (loading && templates.length === 0) {
    return <div>Laden...</div>
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
    <div className="container mx-auto py-6">
      <Tabs defaultValue="templates" className="w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <TabsList>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="flowise">Flowise</TabsTrigger>
            </TabsList>
          </div>
          <Button onClick={() => setEditingTemplate(defaultTemplate)}>
            Template erstellen
          </Button>
        </div>

        <TabsContent value="templates">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {templates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500">Keine Templates vorhanden</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Typ
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Aktionen</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {templates.map((template) => (
                    <tr key={template.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {template.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {template.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          template.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {template.active ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="ghost"
                          className="text-indigo-600 hover:text-indigo-900 mr-2"
                          onClick={() => setEditingTemplate(template)}
                        >
                          Bearbeiten
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-red-600 hover:text-red-900"
                          onClick={() => handleDelete(template.id)}
                        >
                          Löschen
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="flowise">
          <div className="bg-white rounded-lg shadow p-6">
            <FlowiseConfig />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 