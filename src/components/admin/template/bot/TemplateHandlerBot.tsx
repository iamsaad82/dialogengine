'use client'

import { useEffect, useState } from 'react'
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { HandlerConfig } from '@/lib/types/template'
import { TemplateHandlerConfig } from '@/lib/types/bot'
import { GenerateHandler } from '../handlers/GenerateHandler'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'

interface TemplateHandlerBotProps {
  config: TemplateHandlerConfig
  templateId: string
  onChange: (config: TemplateHandlerConfig) => void
}

const defaultConfig: TemplateHandlerConfig = {
  type: 'template-handler',
  active: true,
  handlers: [],
  config: {
    matchThreshold: 0.8,
    contextWindow: 1000,
    maxTokens: 500,
    dynamicResponses: true,
    includeLinks: true,
    includeMetadata: true
  }
}

export function TemplateHandlerBot({ 
  config = defaultConfig, 
  templateId, 
  onChange 
}: TemplateHandlerBotProps) {
  const [loading, setLoading] = useState(false)
  const [availableHandlers, setAvailableHandlers] = useState<HandlerConfig[]>([])

  // Stelle sicher, dass die Konfiguration initialisiert ist
  useEffect(() => {
    const safeConfig: TemplateHandlerConfig = {
      type: 'template-handler',
      active: config.active ?? true,
      handlers: Array.isArray(config.handlers) ? config.handlers : [],
      config: {
        matchThreshold: config.config?.matchThreshold ?? 0.8,
        contextWindow: config.config?.contextWindow ?? 1000,
        maxTokens: config.config?.maxTokens ?? 500,
        dynamicResponses: config.config?.dynamicResponses ?? true,
        includeLinks: config.config?.includeLinks ?? true,
        includeMetadata: config.config?.includeMetadata ?? true
      }
    }
    
    if (!Array.isArray(config.handlers)) {
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
        setAvailableHandlers(data)
      } catch (error) {
        console.error('Fehler beim Laden der Handler:', error)
      }
      setLoading(false)
    }

    loadHandlers()
  }, [templateId])

  const toggleHandler = (handler: HandlerConfig) => {
    const safeConfig: TemplateHandlerConfig = {
      type: 'template-handler',
      active: config.active ?? true,
      handlers: Array.isArray(config.handlers) ? config.handlers : [],
      config: {
        matchThreshold: config.config?.matchThreshold ?? 0.8,
        contextWindow: config.config?.contextWindow ?? 1000,
        maxTokens: config.config?.maxTokens ?? 500,
        dynamicResponses: config.config?.dynamicResponses ?? true,
        includeLinks: config.config?.includeLinks ?? true,
        includeMetadata: config.config?.includeMetadata ?? true
      }
    }
    
    const newHandlers = safeConfig.handlers.includes(handler.id)
      ? safeConfig.handlers.filter(id => id !== handler.id)
      : [...safeConfig.handlers, handler.id]

    onChange({
      ...safeConfig,
      handlers: newHandlers
    })
  }

  const handleGenerated = (handler: HandlerConfig) => {
    setAvailableHandlers([...availableHandlers, handler])
    const safeConfig: TemplateHandlerConfig = {
      type: 'template-handler',
      active: config.active ?? true,
      handlers: Array.isArray(config.handlers) ? config.handlers : [],
      config: {
        matchThreshold: config.config?.matchThreshold ?? 0.8,
        contextWindow: config.config?.contextWindow ?? 1000,
        maxTokens: config.config?.maxTokens ?? 500,
        dynamicResponses: config.config?.dynamicResponses ?? true,
        includeLinks: config.config?.includeLinks ?? true,
        includeMetadata: config.config?.includeMetadata ?? true
      }
    }
    
    onChange({
      ...safeConfig,
      handlers: [...safeConfig.handlers, handler.id]
    })
  }

  const handleHandlerDelete = async (handler: HandlerConfig): Promise<void> => {
    try {
      const response = await fetch(`/api/handlers/${handler.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Fehler beim Löschen des Handlers')
      }

      setAvailableHandlers(availableHandlers.filter(h => h.id !== handler.id))
      const safeConfig: TemplateHandlerConfig = {
        type: 'template-handler',
        active: config.active ?? true,
        handlers: Array.isArray(config.handlers) ? config.handlers : [],
        config: {
          matchThreshold: config.config?.matchThreshold ?? 0.8,
          contextWindow: config.config?.contextWindow ?? 1000,
          maxTokens: config.config?.maxTokens ?? 500,
          dynamicResponses: config.config?.dynamicResponses ?? true,
          includeLinks: config.config?.includeLinks ?? true,
          includeMetadata: config.config?.includeMetadata ?? true
        }
      }
      
      onChange({
        ...safeConfig,
        handlers: safeConfig.handlers.filter(id => id !== handler.id)
      })
    } catch (error) {
      console.error('Fehler beim Löschen des Handlers:', error)
    }
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
          {availableHandlers.map(handler => (
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
                  onClick={() => toggleHandler(handler)}
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