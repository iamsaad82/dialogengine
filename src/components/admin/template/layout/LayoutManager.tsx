'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { LayoutList } from './LayoutList'
import { LayoutEditor } from './LayoutEditor'
import type { ResponseContentType } from '@/lib/types/contentTypes'

interface LayoutConfig {
  id: string
  name: string
  description?: string
  config: {
    type: ResponseContentType
    template: string
    conditions: {
      requiredSchemas: string[]
      requiredHandlers: string[]
      contextRules: Array<{
        field: string
        operator: 'equals' | 'contains' | 'startsWith' | 'endsWith'
        value: string
      }>
    }
  }
  metadata: {
    icon?: string
    previewImage?: string
    lastModified: string
    version: number
  }
}

interface LayoutManagerProps {
  templateId: string
}

export function LayoutManager({ templateId }: LayoutManagerProps) {
  const [activeTab, setActiveTab] = useState('list')
  const [layouts, setLayouts] = useState<LayoutConfig[]>([])
  const [selectedLayout, setSelectedLayout] = useState<LayoutConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadLayouts()
  }, [templateId])

  const loadLayouts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/templates/${templateId}/layouts`)
      if (!response.ok) throw new Error('Fehler beim Laden der Layouts')
      const data = await response.json()
      setLayouts(data)
    } catch (error) {
      console.error('Fehler beim Laden der Layouts:', error)
      toast({
        title: 'Fehler',
        description: 'Die Layouts konnten nicht geladen werden.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdated = async (layout: LayoutConfig) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/layouts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(layout)
      })
      
      if (!response.ok) throw new Error('Fehler beim Aktualisieren')
      
      const updatedLayout = await response.json()
      setLayouts(prev => prev.map(l => l.id === updatedLayout.id ? updatedLayout : l))
      setSelectedLayout(null)
      setActiveTab('list')
      
      toast({
        title: 'Layout aktualisiert',
        description: 'Die Änderungen wurden erfolgreich gespeichert.'
      })
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Layouts:', error)
      toast({
        title: 'Fehler',
        description: 'Die Änderungen konnten nicht gespeichert werden.'
      })
    }
  }

  const handleDeleted = async (layout: LayoutConfig) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/layouts?layoutId=${layout.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Fehler beim Löschen')
      
      setLayouts(prev => prev.filter(l => l.id !== layout.id))
      toast({
        title: 'Layout gelöscht',
        description: 'Das Layout wurde erfolgreich gelöscht.'
      })
    } catch (error) {
      console.error('Fehler beim Löschen des Layouts:', error)
      toast({
        title: 'Fehler',
        description: 'Das Layout konnte nicht gelöscht werden.'
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
          <h2 className="text-2xl font-bold">Layout-Verwaltung</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Definieren Sie, wie der Bot auf verschiedene Anfragen reagieren soll.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Übersicht</TabsTrigger>
          {selectedLayout && (
            <TabsTrigger value="edit">Layout bearbeiten</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Layouts bestimmen das Aussehen und Verhalten von Bot-Antworten basierend auf erkannten Inhalten.
                </p>
              </div>
              <LayoutList
                layouts={layouts}
                onEdit={(layout) => {
                  setSelectedLayout(layout)
                  setActiveTab('edit')
                }}
                onDelete={handleDeleted}
              />
            </div>
          </Card>
        </TabsContent>

        {selectedLayout && (
          <TabsContent value="edit" className="mt-4">
            <Card className="p-6">
              <LayoutEditor
                layout={selectedLayout}
                onSave={handleUpdated}
                onCancel={() => {
                  setSelectedLayout(null)
                  setActiveTab('list')
                }}
                onDelete={() => {
                  handleDeleted(selectedLayout)
                  setSelectedLayout(null)
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