'use client'

import { useEffect, useState } from 'react'
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import type { TemplateHandlerConfig, HandlerConfig } from '@/lib/types/template'
import { GenerateHandler } from '../handlers/GenerateHandler'

interface TemplateHandlerBotProps {
  config: TemplateHandlerConfig
  templateId: string
  onChange: (config: TemplateHandlerConfig) => void
}

export function TemplateHandlerBot({ config = { handlers: [], config: {} }, templateId, onChange }: TemplateHandlerBotProps) {
  const [loading, setLoading] = useState(false)
  const [handlers, setHandlers] = useState<HandlerConfig[]>([])

  // Stelle sicher, dass die Konfiguration initialisiert ist
  useEffect(() => {
    const safeConfig = {
      handlers: Array.isArray(config?.handlers) ? config.handlers : [],
      config: config?.config || {}
    }
    
    if (!Array.isArray(config?.handlers)) {
      onChange(safeConfig)
    }
  }, [config])

  // Lade die verfügbaren Handler
  useEffect(() => {
    const loadHandlers = async () => {
      if (!templateId) return
      
      setLoading(true)
      try {
        const response = await fetch('/api/handlers')
        const data = await response.json()
        setHandlers(data.map((handler: any) => ({
          ...handler,
          capabilities: handler.capabilities || []
        })))
      } catch (error) {
        console.error('Fehler beim Laden der Handler:', error)
      }
      setLoading(false)
    }

    loadHandlers()
  }, [templateId])

  const toggleHandler = (handlerId: string) => {
    const safeConfig = {
      handlers: Array.isArray(config?.handlers) ? config.handlers : [],
      config: config?.config || {}
    }
    
    const newHandlers = safeConfig.handlers.includes(handlerId)
      ? safeConfig.handlers.filter(id => id !== handlerId)
      : [...safeConfig.handlers, handlerId]

    onChange({
      ...safeConfig,
      handlers: newHandlers
    })
  }

  const handleGenerated = (handler: HandlerConfig) => {
    setHandlers([...handlers, handler])
    const safeConfig = {
      handlers: Array.isArray(config?.handlers) ? config.handlers : [],
      config: config?.config || {}
    }
    
    onChange({
      ...safeConfig,
      handlers: [...safeConfig.handlers, handler.id]
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Verfügbare Handler</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {handlers.map(handler => (
            <Card key={handler.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{handler.name}</h3>
                  <p className="text-sm text-gray-500">{handler.type}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(handler.capabilities || []).map((cap: string) => (
                      <Badge key={cap} variant="secondary">
                        {cap}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant={config.handlers?.includes(handler.id) ? "default" : "outline"}
                  onClick={() => toggleHandler(handler.id)}
                >
                  {config.handlers?.includes(handler.id) ? "Aktiv" : "Inaktiv"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <Label>Neuen Handler generieren</Label>
        <div className="mt-2">
          <GenerateHandler
            templateId={templateId}
            onGenerated={handleGenerated}
          />
        </div>
      </div>
    </div>
  )
} 