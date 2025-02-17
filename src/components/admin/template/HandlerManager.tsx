import { useEffect, useState } from 'react'
import { HandlerConfig } from '@/lib/types/template'
import { HandlerForm } from './HandlerForm'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

interface HandlerManagerProps {
  templateId: string
}

export function HandlerManager({ templateId }: HandlerManagerProps) {
  const [handlers, setHandlers] = useState<HandlerConfig[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadHandlers()
  }, [templateId])

  const loadHandlers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/templates/${templateId}/handlers`)
      if (!response.ok) throw new Error('Fehler beim Laden')
      const data = await response.json()
      setHandlers(data.handlers || [])
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

  const handleSave = async (handler: HandlerConfig) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/handlers`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ handler })
      })

      if (!response.ok) throw new Error('Fehler beim Speichern')

      toast({
        title: 'Erfolg',
        description: 'Handler wurde gespeichert.'
      })

      // Aktualisiere die Handler-Liste
      loadHandlers()
    } catch (error) {
      console.error('Fehler beim Speichern des Handlers:', error)
      toast({
        title: 'Fehler',
        description: 'Der Handler konnte nicht gespeichert werden.'
      })
    }
  }

  const handleDelete = async (type: string) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/handlers/${type}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Fehler beim Löschen')

      toast({
        title: 'Erfolg',
        description: 'Handler wurde gelöscht.'
      })

      // Aktualisiere die Handler-Liste
      loadHandlers()
    } catch (error) {
      console.error('Fehler beim Löschen des Handlers:', error)
      toast({
        title: 'Fehler',
        description: 'Der Handler konnte nicht gelöscht werden.'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Handler verwalten</h2>
        <Button
          onClick={() => {
            const newHandler: HandlerConfig = {
              type: 'medical',
              active: true,
              metadata: {
                keyTopics: [],
                entities: [],
                facts: []
              },
              responses: [],
              settings: {
                matchThreshold: 0.7,
                contextWindow: 3,
                maxTokens: 150,
                dynamicResponses: true,
                includeLinks: true
              }
            }
            setHandlers([...handlers, newHandler])
          }}
        >
          Neuer Handler
        </Button>
      </div>

      <div className="space-y-4">
        {handlers.map((handler, index) => (
          <HandlerForm
            key={index}
            handler={handler}
            onSave={handleSave}
            onDelete={() => handleDelete(handler.type)}
          />
        ))}
      </div>
    </div>
  )
} 