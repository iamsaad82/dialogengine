'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { SchemaList } from './SchemaList'
import { SchemaEditor } from './SchemaEditor'
import type { ExtractionSchema } from '@/lib/types/schema'

interface SchemaManagerProps {
  templateId: string
}

export function SchemaManager({ templateId }: SchemaManagerProps) {
  const [activeTab, setActiveTab] = useState('list')
  const [schemas, setSchemas] = useState<ExtractionSchema[]>([])
  const [selectedSchema, setSelectedSchema] = useState<ExtractionSchema | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadSchemas()
  }, [templateId])

  const loadSchemas = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/templates/${templateId}/schemas`)
      if (!response.ok) throw new Error('Fehler beim Laden der Schemas')
      const data = await response.json()
      setSchemas(data)
    } catch (error) {
      console.error('Fehler beim Laden der Schemas:', error)
      toast({
        title: 'Fehler',
        description: 'Die Schemas konnten nicht geladen werden.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdated = async (schema: ExtractionSchema) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/schemas/${schema.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schema)
      })
      
      if (!response.ok) throw new Error('Fehler beim Aktualisieren')
      
      const updatedSchema = await response.json()
      setSchemas(prev => prev.map(s => s.id === updatedSchema.id ? updatedSchema : s))
      setSelectedSchema(null)
      setActiveTab('list')
      
      toast({
        title: 'Schema aktualisiert',
        description: 'Die Änderungen wurden erfolgreich gespeichert.'
      })
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Schemas:', error)
      toast({
        title: 'Fehler',
        description: 'Die Änderungen konnten nicht gespeichert werden.'
      })
    }
  }

  const handleDeleted = async (schema: ExtractionSchema) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/schemas/${schema.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Fehler beim Löschen')
      
      setSchemas(prev => prev.filter(s => s.id !== schema.id))
      toast({
        title: 'Schema gelöscht',
        description: 'Das Schema wurde erfolgreich gelöscht.'
      })
    } catch (error) {
      console.error('Fehler beim Löschen des Schemas:', error)
      toast({
        title: 'Fehler',
        description: 'Das Schema konnte nicht gelöscht werden.'
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Schema-Verwaltung</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Schemas definieren, wie Inhalte aus Dokumenten extrahiert und strukturiert werden.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Übersicht</TabsTrigger>
          {selectedSchema && (
            <TabsTrigger value="edit">Schema bearbeiten</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Schemas werden automatisch beim Dokument-Upload generiert und können hier angepasst werden.
                </p>
              </div>
              <SchemaList
                schemas={schemas}
                onEdit={(schema) => {
                  setSelectedSchema(schema)
                  setActiveTab('edit')
                }}
                onDelete={handleDeleted}
              />
            </div>
          </Card>
        </TabsContent>

        {selectedSchema && (
          <TabsContent value="edit" className="mt-4">
            <Card className="p-6">
              <SchemaEditor
                schema={selectedSchema}
                onSave={handleUpdated}
                onCancel={() => {
                  setSelectedSchema(null)
                  setActiveTab('list')
                }}
                onDelete={() => {
                  handleDeleted(selectedSchema)
                  setSelectedSchema(null)
                  setActiveTab('list')
                }}
              />
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
} 