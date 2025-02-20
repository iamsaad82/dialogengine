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
import { Info } from "lucide-react"
import { useHandlerTypes } from "@/lib/hooks/useHandlerTypes"

interface HandlerEditorProps {
  handler: HandlerConfig
  onSave: (handler: HandlerConfig) => void
  onCancel: () => void
}

export function HandlerEditor({ handler, onSave, onCancel }: HandlerEditorProps) {
  const [editedHandler, setEditedHandler] = useState<HandlerConfig>({
    ...handler,
    capabilities: Array.isArray(handler.capabilities) ? handler.capabilities : []
  })
  
  const { types, isLoading } = useHandlerTypes()

  const handleChange = (field: keyof HandlerConfig, value: any) => {
    setEditedHandler(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSettingChange = (field: string, value: any) => {
    setEditedHandler(prev => ({
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

  // Gruppiere Capabilities nach Typ
  const groupedCapabilities = editedHandler.capabilities.reduce((acc, cap) => {
    const [type] = cap.split(':')
    if (!acc[type]) acc[type] = []
    acc[type].push(cap)
    return acc
  }, {} as Record<string, string[]>)

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
            <Label>Name</Label>
            <p className="text-sm text-muted-foreground mb-2">
              {editedHandler.metadata?.generated 
                ? "Automatisch generierter Name basierend auf den analysierten Dokumenten"
                : "Name des Handlers"}
            </p>
            <Input
              value={editedHandler.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="z.B. FAQ Handler, Produkt Handler"
            />
          </div>

          <div>
            <Label>Typ</Label>
            <p className="text-sm text-muted-foreground mb-2">
              {editedHandler.metadata?.generated 
                ? "Automatisch erkannter Dokumenttyp"
                : "Art des Handlers"}
            </p>
            <Select
              value={editedHandler.type}
              onValueChange={(value) => handleChange('type', value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Lade Handler-Typen..." : "Typ auswählen"} />
              </SelectTrigger>
              <SelectContent>
                {types?.map(type => (
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
              <span>Handler aktiv</span>
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Aktivieren Sie diese Option, um den Handler im System zu verwenden
            </p>
          </div>
        </Card>
      </div>

      {/* Fähigkeiten */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Erkannte Fähigkeiten</h3>
        <Card className="p-4">
          <div className="space-y-4">
            {Object.entries(groupedCapabilities).map(([type, capabilities]) => (
              <div key={type}>
                <Label className="mb-2">{type}</Label>
                <div className="flex flex-wrap gap-2">
                  {capabilities.map((cap) => (
                    <Badge key={cap} variant="secondary">
                      {cap.split(':')[1]}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(groupedCapabilities).length === 0 && (
              <p className="text-sm text-muted-foreground">
                Keine Fähigkeiten definiert
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Erweiterte Einstellungen */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Erweiterte Einstellungen</h3>
        
        <Card className="p-4">
          <Label>Genauigkeit der Übereinstimmung</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Bestimmt, wie genau eine Anfrage mit dem vorhandenen Inhalt übereinstimmen muss.
            Ein höherer Wert (näher an 1.0) bedeutet präzisere Antworten, aber möglicherweise weniger Treffer.
          </p>
          <Input
            type="number"
            min={0}
            max={1}
            step={0.1}
            value={editedHandler.config.settings.matchThreshold}
            onChange={(e) => handleSettingChange('matchThreshold', parseFloat(e.target.value))}
          />
        </Card>

        <Card className="p-4">
          <Label>Kontextfenster</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Die Anzahl der Zeichen, die als Kontext um einen gefundenen Treffer herum berücksichtigt werden.
            Ein größeres Fenster liefert mehr Kontext für präzisere Antworten.
          </p>
          <Input
            type="number"
            min={500}
            max={2000}
            step={100}
            value={editedHandler.config.settings.contextWindow}
            onChange={(e) => handleSettingChange('contextWindow', parseInt(e.target.value))}
          />
        </Card>

        <Card className="p-4">
          <Label>Maximale Antwortlänge</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Die maximale Länge der generierten Antworten in Tokens.
            Ein Token entspricht etwa 4 Zeichen oder einem Wort.
          </p>
          <Input
            type="number"
            min={200}
            max={1000}
            step={50}
            value={editedHandler.config.settings.maxTokens}
            onChange={(e) => handleSettingChange('maxTokens', parseInt(e.target.value))}
          />
        </Card>

        <Card className="p-4">
          <Label className="flex items-center gap-2">
            <Switch
              checked={editedHandler.config.settings.dynamicResponses}
              onCheckedChange={(checked) => handleSettingChange('dynamicResponses', checked)}
            />
            <span>Dynamische Antworten</span>
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Wenn aktiviert, kann der Handler Antworten dynamisch an den Kontext anpassen.
            Dies führt zu natürlicheren Antworten, die besser auf die spezifische Frage eingehen.
          </p>
        </Card>

        <Card className="p-4">
          <Label className="flex items-center gap-2">
            <Switch
              checked={editedHandler.config.settings.includeLinks}
              onCheckedChange={(checked) => handleSettingChange('includeLinks', checked)}
            />
            <span>Links einbinden</span>
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Fügt relevante Links zu weiteren Informationen in die Antworten ein.
            Nützlich für Verweise auf detaillierte Produktseiten oder weiterführende Informationen.
          </p>
        </Card>

        <Card className="p-4">
          <Label className="flex items-center gap-2">
            <Switch
              checked={editedHandler.config.settings.useExactMatches}
              onCheckedChange={(checked) => handleSettingChange('useExactMatches', checked)}
            />
            <span>Exakte Übereinstimmungen bevorzugen</span>
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Wenn aktiviert, werden exakte Übereinstimmungen in den Dokumenten bevorzugt.
            Dies kann die Präzision erhöhen, aber möglicherweise weniger Treffer liefern.
          </p>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button onClick={() => onSave(editedHandler)}>
          Speichern
        </Button>
      </div>
    </div>
  )
} 