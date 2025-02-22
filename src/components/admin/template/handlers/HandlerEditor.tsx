'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { HandlerConfig } from "@/lib/types/template"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Info, Trash2 } from "lucide-react"
import { useHandlerTypes } from "@/lib/hooks/useHandlerTypes"
import { toast } from 'sonner'

interface HandlerEditorProps {
  handler: HandlerConfig
  onSave: (handler: HandlerConfig) => void
  onCancel: () => void
  onDelete?: () => void
  templateId: string
}

export function HandlerEditor({ handler, onSave, onCancel, onDelete, templateId }: HandlerEditorProps) {
  const [editedHandler, setEditedHandler] = useState<HandlerConfig>({
    ...handler,
    capabilities: Array.isArray(handler.capabilities) ? handler.capabilities : []
  })
  const [isDeleting, setIsDeleting] = useState(false)
  
  const { data, isLoading, error } = useHandlerTypes()
  const types = data?.types || []

  const handleChange = (field: keyof HandlerConfig, value: any) => {
    setEditedHandler((prev: HandlerConfig) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSettingChange = (field: string, value: any) => {
    setEditedHandler((prev: HandlerConfig) => ({
      ...prev,
      config: {
        ...prev.config,
        settings: {
          ...prev.config.settings,
          [field]: value
        }
      }
    }))
  }

  const handleDelete = async () => {
    if (!handler.id || !templateId) return
    
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/templates/${templateId}/handlers/${handler.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Fehler beim Löschen des Handlers')
      }

      toast.success('Handler erfolgreich gelöscht')
      onDelete?.()
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
      toast.error('Fehler beim Löschen des Handlers')
    } finally {
      setIsDeleting(false)
    }
  }

  // Gruppiere Capabilities nach Typ
  const groupedCapabilities = editedHandler.capabilities.reduce((acc: Record<string, string[]>, cap: string) => {
    const [type] = cap.split(':')
    if (!acc[type]) acc[type] = []
    acc[type].push(cap)
    return acc
  }, {} as Record<string, string[]>)

  if (isLoading) {
    return <div>Lade Handler-Typen...</div>
  }

  if (error) {
    return <div>Fehler beim Laden der Handler-Typen: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      {/* Basis-Informationen */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Handler-Informationen</h3>
          {editedHandler.metadata?.generated && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              Automatisch generiert
            </Badge>
          )}
        </div>
        
        <Card className="p-4 space-y-4">
          <div>
            <Label>Bezeichnung</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Der Name, unter dem dieser Handler im System angezeigt wird
            </p>
            <Input
              value={editedHandler.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="z.B. Sport und Ernährung, Gesundheitsvorsorge"
            />
          </div>

          <div>
            <Label>Kategorie</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Die Art der Inhalte, die dieser Handler verarbeitet
            </p>
            <Select
              value={editedHandler.type}
              onValueChange={(value) => handleChange('type', value)}
              disabled={editedHandler.metadata?.generated}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Lade Kategorien..." : "Kategorie auswählen"} />
              </SelectTrigger>
              <SelectContent>
                {types.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Switch
                checked={editedHandler.active}
                onCheckedChange={(checked) => handleChange('active', checked)}
              />
              <span>Aktiv</span>
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Wenn aktiviert, wird dieser Handler für die Beantwortung von Fragen verwendet
            </p>
          </div>
        </Card>
      </div>

      {/* Themen und Schlagworte */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Themen und Schlagworte</h3>
        <Card className="p-4">
          <div className="space-y-4">
            {editedHandler.metadata?.suggestedMetadata && (
              <>
                <div>
                  <Label>Bereich</Label>
                  <p className="text-sm font-medium mt-1">
                    {editedHandler.metadata.suggestedMetadata.domain} - {editedHandler.metadata.suggestedMetadata.subDomain}
                  </p>
                </div>

                <div>
                  <Label>Schlagworte</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editedHandler.metadata.suggestedMetadata.keywords?.map((keyword: string) => (
                      <Badge key={keyword}>{keyword}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Abdeckung</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editedHandler.metadata.suggestedMetadata.coverage?.map((item: string) => (
                      <Badge key={item} variant="outline">{item}</Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Antwortverhalten */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Antwortverhalten</h3>
        
        <Card className="p-4 space-y-4">
          <div>
            <Label className="flex items-center gap-2">
              <Switch
                checked={editedHandler.config.settings.dynamicResponses}
                onCheckedChange={(checked) => handleSettingChange('dynamicResponses', checked)}
              />
              <span>Flexible Antworten</span>
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Ermöglicht es dem System, Antworten flexibel an die Frage anzupassen
            </p>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Switch
                checked={editedHandler.config.settings.includeLinks}
                onCheckedChange={(checked) => handleSettingChange('includeLinks', checked)}
              />
              <span>Weiterführende Links</span>
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Fügt passende Links zu weiteren Informationen in die Antworten ein
            </p>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Switch
                checked={editedHandler.config.settings.useExactMatches}
                onCheckedChange={(checked) => handleSettingChange('useExactMatches', checked)}
              />
              <span>Präzise Antworten</span>
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Bevorzugt exakte Übereinstimmungen für präzisere Antworten
            </p>
          </div>
        </Card>
      </div>

      {/* Verknüpfte Dokumente */}
      {editedHandler.metadata?.documents && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Verknüpfte Dokumente</h3>
          <Card className="p-4">
            <div className="space-y-2">
              {editedHandler.metadata.documents.map((doc: any) => (
                <div key={doc.filename} className="flex items-center justify-between text-sm">
                  <span>{doc.filename}</span>
                  <Badge variant="outline">{new Date(doc.addedAt).toLocaleDateString()}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="flex justify-between gap-4">
        <Button 
          variant="destructive" 
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          {isDeleting ? 'Wird gelöscht...' : 'Löschen'}
        </Button>
        <div className="flex gap-4">
          <Button variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button onClick={() => onSave(editedHandler)}>
            Speichern
          </Button>
        </div>
      </div>
    </div>
  )
} 