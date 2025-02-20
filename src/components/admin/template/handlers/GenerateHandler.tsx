'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { HandlerConfig } from '@/lib/types/template'

interface GenerateHandlerProps {
  templateId: string
  onGenerated: (handler: HandlerConfig) => void
}

export function GenerateHandler({ templateId, onGenerated }: GenerateHandlerProps) {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<HandlerConfig | null>(null)
  const { toast } = useToast()

  const loadPreview = async () => {
    if (!templateId) {
      toast({
        title: 'Fehler',
        description: 'Template ID fehlt',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/handlers/generate?templateId=${templateId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler bei der Handler-Vorschau')
      }

      setPreview(data)
    } catch (error) {
      console.error('Fehler bei der Handler-Vorschau:', error)
      toast({
        title: 'Fehler',
        description: 'Die Handler-Vorschau konnte nicht geladen werden.',
        variant: 'destructive'
      })
    }
    setLoading(false)
  }

  const generateHandler = async () => {
    if (!preview || !templateId) return

    setLoading(true)
    try {
      const response = await fetch('/api/handlers/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId,
          config: preview.config,
          patterns: preview.config.patterns,
          metadata: preview.config.metadata
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler bei der Handler-Generierung')
      }

      onGenerated(data)
      toast({
        title: 'Erfolg',
        description: 'Der Handler wurde erfolgreich generiert.'
      })
    } catch (error) {
      console.error('Fehler bei der Handler-Generierung:', error)
      toast({
        title: 'Fehler',
        description: 'Der Handler konnte nicht generiert werden.',
        variant: 'destructive'
      })
    }
    setLoading(false)
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
      {!preview ? (
        <Button onClick={loadPreview}>
          Handler-Vorschau laden
        </Button>
      ) : (
        <Card className="p-4 space-y-4">
          <div>
            <h3 className="font-medium">{preview.name}</h3>
            <p className="text-sm text-gray-500">{preview.type}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {preview.capabilities.map((cap) => (
                <Badge key={cap} variant="secondary">
                  {cap}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPreview(null)}>
              Zurücksetzen
            </Button>
            <Button onClick={generateHandler}>
              Handler generieren
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
} 