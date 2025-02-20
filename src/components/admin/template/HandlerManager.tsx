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
      const response = await fetch('/api/handlers')
      if (!response.ok) throw new Error('Fehler beim Laden')
      const data = await response.json()
      setHandlers(data)
    } catch (error) {
      console.error('Fehler beim Laden der Handler:', error)
      toast({
        title: 'Fehler',
        description: 'Die Handler konnten nicht geladen werden.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerated = (handler: HandlerConfig) => {
    setHandlers(prev => [...prev, handler])
    toast({
      title: 'Handler erstellt',
      description: 'Der Handler wurde erfolgreich generiert.'
    })
  }

  const handleUpdated = (handler: HandlerConfig) => {
    setHandlers(prev => prev.map(h => h.id === handler.id ? handler : h))
    setSelectedHandler(null)
    setActiveTab('list')
    toast({
      title: 'Handler aktualisiert',
      description: 'Die Änderungen wurden gespeichert.'
    })
  }

  const handleDeleted = (handler: HandlerConfig) => {
    setHandlers(prev => prev.filter(h => h.id !== handler.id))
    toast({
      title: 'Handler gelöscht',
      description: 'Der Handler wurde erfolgreich gelöscht.'
    })
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
          <TabsTrigger value="list">
            Handler
          </TabsTrigger>
          <TabsTrigger value="generate">
            Generator
          </TabsTrigger>
          {selectedHandler && (
            <TabsTrigger value="edit">
              Bearbeiten
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card className="p-4">
            <HandlerList
              handlers={handlers}
              onEdit={(handler) => {
                setSelectedHandler(handler)
                setActiveTab('edit')
              }}
              onDelete={handleDeleted}
            />
          </Card>
        </TabsContent>

        <TabsContent value="generate" className="mt-4">
          <Card className="p-4">
            <GenerateHandler
              templateId={templateId}
              onGenerated={handleGenerated}
            />
          </Card>
        </TabsContent>

        {selectedHandler && (
          <TabsContent value="edit" className="mt-4">
            <Card className="p-4">
              <HandlerEditor
                handler={selectedHandler}
                onSave={handleUpdated}
                onCancel={() => {
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