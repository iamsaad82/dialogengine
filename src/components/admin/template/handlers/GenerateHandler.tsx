'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { HandlerConfig, HandlerTemplateConfig } from '@/lib/types/template'
import { ResponseType } from '@/lib/types/common'

interface GenerateHandlerProps {
  templateId: string
  onGenerated: (handler: HandlerConfig) => void
}

const RESPONSE_TYPES: ResponseType[] = [
  'text',
  'info',
  'service',
  'product',
  'event',
  'location',
  'video',
  'link',
  'contact',
  'faq',
  'download'
]

export function GenerateHandler({ templateId, onGenerated }: GenerateHandlerProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<HandlerTemplateConfig>({
    name: '',
    description: '',
    type: 'custom',
    capabilities: [],
    validation: {
      required: false,
      rules: []
    },
    responseTypes: [],
    requiredMetadata: [],
    customSettings: {
      useMarkdown: false,
      formatDates: false,
      includeMeta: false,
      useTemplating: false
    },
    patterns: [],
    metadataDefinitions: []
  })

  const validateConfig = () => {
    if (!config.name.trim()) {
      toast({
        title: 'Validierungsfehler',
        description: 'Bitte geben Sie einen Namen ein.',
        variant: 'destructive'
      })
      return false
    }

    if (!config.description.trim()) {
      toast({
        title: 'Validierungsfehler',
        description: 'Bitte geben Sie eine Beschreibung ein.',
        variant: 'destructive'
      })
      return false
    }

    if (config.responseTypes.length === 0) {
      toast({
        title: 'Validierungsfehler',
        description: 'Bitte wählen Sie mindestens einen Antworttyp aus.',
        variant: 'destructive'
      })
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateConfig()) return

    try {
      setLoading(true)
      const response = await fetch(`/api/templates/${templateId}/handlers/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Fehler beim Generieren')
      }

      const handler = await response.json()
      onGenerated(handler)
      toast({
        title: 'Handler generiert',
        description: 'Der Handler wurde erfolgreich erstellt.'
      })
    } catch (error) {
      console.error('Fehler beim Generieren des Handlers:', error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Der Handler konnte nicht generiert werden.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={config.name}
          onChange={(e) => setConfig({ ...config, name: e.target.value })}
          placeholder="Name des Handlers"
        />
      </div>

      <div>
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea
          id="description"
          value={config.description}
          onChange={(e) => setConfig({ ...config, description: e.target.value })}
          placeholder="Beschreibung des Handlers..."
        />
      </div>

      <div>
        <Label htmlFor="type">Typ</Label>
        <Select
          value={config.type}
          onValueChange={(value) => setConfig({ ...config, type: value })}
        >
          <SelectTrigger id="type">
            <SelectValue placeholder="Typ auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">Benutzerdefiniert</SelectItem>
            <SelectItem value="service">Service</SelectItem>
            <SelectItem value="product">Produkt</SelectItem>
            <SelectItem value="faq">FAQ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Antworttypen</Label>
        <div className="grid grid-cols-2 gap-4 mt-2">
          {RESPONSE_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2">
              <Checkbox
                checked={config.responseTypes.includes(type)}
                onCheckedChange={(checked) => {
                  setConfig({
                    ...config,
                    responseTypes: checked
                      ? [...config.responseTypes, type]
                      : config.responseTypes.filter(t => t !== type)
                  })
                }}
              />
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label>Einstellungen</Label>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={config.customSettings.useMarkdown}
              onCheckedChange={(checked) => setConfig({
                ...config,
                customSettings: {
                  ...config.customSettings,
                  useMarkdown: checked as boolean
                }
              })}
            />
            Markdown verwenden
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={config.customSettings.formatDates}
              onCheckedChange={(checked) => setConfig({
                ...config,
                customSettings: {
                  ...config.customSettings,
                  formatDates: checked as boolean
                }
              })}
            />
            Datumsformatierung
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={config.customSettings.includeMeta}
              onCheckedChange={(checked) => setConfig({
                ...config,
                customSettings: {
                  ...config.customSettings,
                  includeMeta: checked as boolean
                }
              })}
            />
            Metadaten einschließen
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={config.customSettings.useTemplating}
              onCheckedChange={(checked) => setConfig({
                ...config,
                customSettings: {
                  ...config.customSettings,
                  useTemplating: checked as boolean
                }
              })}
            />
            Templating aktivieren
          </label>
        </div>
      </div>

      <Button 
        onClick={handleSubmit} 
        className="w-full"
        disabled={loading}
      >
        {loading ? 'Generiere Handler...' : 'Handler generieren'}
      </Button>
    </div>
  )
} 