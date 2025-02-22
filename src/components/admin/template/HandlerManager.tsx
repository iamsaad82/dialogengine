'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus } from "lucide-react"
import type { HandlerConfig } from '@/lib/types/template'
import { HandlerList } from './handlers/HandlerList'
import { HandlerEditor } from './handlers/HandlerEditor'
import { GenerateHandler } from './handlers/GenerateHandler'

interface HandlerManagerProps {
  templateId: string
}

export function HandlerManager({ templateId }: HandlerManagerProps) {
  const [activeTab, setActiveTab] = useState('list')
  const [handlers, setHandlers] = useState<HandlerConfig[]>([])
  const [selectedHandler, setSelectedHandler] = useState<HandlerConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadHandlers()
  }, [templateId])

  const loadHandlers = async () => {
    try {
      setLoading(true)
      console.log('🔍 Lade Handler für Template:', templateId)
      
      const response = await fetch(`/api/templates/${templateId}/handlers`)
      if (!response.ok) {
        throw new Error(`Fehler beim Laden: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('📊 Geladene Handler-Daten:', data)
      
      // Stelle sicher, dass wir ein Array haben
      const handlers = Array.isArray(data) ? data : []
      console.log('✅ Verarbeitete Handler:', handlers)
      
      setHandlers(handlers)
    } catch (error) {
      console.error('❌ Fehler beim Laden der Handler:', error)
      toast({
        title: 'Fehler',
        description: 'Die Handler konnten nicht geladen werden.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerated = async (handler: HandlerConfig) => {
    try {
      console.log('📝 Speichere generierten Handler:', handler)
      
      const response = await fetch(`/api/templates/${templateId}/handlers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(handler),
      })
      
      if (!response.ok) throw new Error('Fehler beim Speichern')
      
      const savedHandler = await response.json()
      console.log('✅ Handler gespeichert:', savedHandler)
      
      setHandlers(prev => [...prev, savedHandler])
      toast({
        title: 'Handler erstellt',
        description: 'Der Handler wurde erfolgreich generiert und gespeichert.'
      })
    } catch (error) {
      console.error('❌ Fehler beim Speichern des Handlers:', error)
      toast({
        title: 'Fehler',
        description: 'Der Handler konnte nicht gespeichert werden.'
      })
    }
  }

  const handleUpdated = async (handler: HandlerConfig) => {
    try {
      console.log('📝 Aktualisiere Handler:', handler)
      
      const response = await fetch(`/api/templates/${templateId}/handlers/${handler.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(handler),
      })
      
      if (!response.ok) throw new Error('Fehler beim Aktualisieren')
      
      const updatedHandler = await response.json()
      console.log('✅ Handler aktualisiert:', updatedHandler)
      
      setHandlers(prev => prev.map(h => h.id === updatedHandler.id ? updatedHandler : h))
      setSelectedHandler(null)
      setActiveTab('list')
      toast({
        title: 'Handler aktualisiert',
        description: 'Die Änderungen wurden erfolgreich gespeichert.'
      })
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren des Handlers:', error)
      toast({
        title: 'Fehler',
        description: 'Die Änderungen konnten nicht gespeichert werden.'
      })
    }
  }

  const handleDeleted = async (handler: HandlerConfig) => {
    try {
      console.log('🗑️ Lösche Handler:', handler)
      
      const response = await fetch(`/api/templates/${templateId}/handlers/${handler.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) throw new Error('Fehler beim Löschen')
      
      console.log('✅ Handler gelöscht')
      
      setHandlers(prev => prev.filter(h => h.id !== handler.id))
      
      if (selectedHandler?.id === handler.id) {
        setSelectedHandler(null)
        setActiveTab('list')
      }
      
      toast({
        title: 'Handler gelöscht',
        description: 'Der Handler wurde erfolgreich gelöscht.'
      })
    } catch (error) {
      console.error('❌ Fehler beim Löschen des Handlers:', error)
      toast({
        title: 'Fehler',
        description: 'Der Handler konnte nicht gelöscht werden.'
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
        <h2 className="text-2xl font-bold">Handler-Verwaltung</h2>
        <Button onClick={() => setActiveTab('generate')}>
          <Plus className="h-4 w-4 mr-2" />
          Neuer Handler
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Handler</TabsTrigger>
          <TabsTrigger value="generate">Generator</TabsTrigger>
          {selectedHandler && (
            <TabsTrigger value="edit">Bearbeiten</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card className="p-6">
            <HandlerList
              handlers={handlers}
              templateId={templateId}
              onEdit={(handler) => {
                setSelectedHandler(handler)
                setActiveTab('edit')
              }}
              onDelete={handleDeleted}
            />
          </Card>
        </TabsContent>

        <TabsContent value="generate" className="mt-4">
          <Card className="p-6">
            <GenerateHandler
              templateId={templateId}
              onGenerated={handleGenerated}
            />
          </Card>
        </TabsContent>

        {selectedHandler && (
          <TabsContent value="edit" className="mt-4">
            <Card className="p-6">
              <HandlerEditor
                handler={selectedHandler}
                templateId={templateId}
                onSave={handleUpdated}
                onCancel={() => {
                  setSelectedHandler(null)
                  setActiveTab('list')
                }}
                onDelete={() => {
                  handleDeleted(selectedHandler)
                  setSelectedHandler(null)
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