'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import type { DocumentTypeDefinition } from '@/lib/types/documentTypes'
import type { BaseContentType } from '@/lib/types/contentTypes'

interface DocumentTypeEditorProps {
  documentType: DocumentTypeDefinition
  onSave: (type: DocumentTypeDefinition) => void
  onCancel: () => void
  onDelete?: () => void
}

export function DocumentTypeEditor({ 
  documentType: initialType,
  onSave,
  onCancel,
  onDelete 
}: DocumentTypeEditorProps) {
  const [activeTab, setActiveTab] = useState('basic')
  const [editedType, setEditedType] = useState(initialType)
  const [saving, setSaving] = useState(false)

  const handleChange = (field: keyof DocumentTypeDefinition, value: any) => {
    setEditedType(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleMetadataChange = (field: string, value: any) => {
    setEditedType(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [field]: value
      }
    }))
  }

  const handlePatternChange = (index: number, field: string, value: any) => {
    setEditedType(prev => ({
      ...prev,
      patterns: prev.patterns.map((pattern, i) => 
        i === index ? { ...pattern, [field]: value } : pattern
      )
    }))
  }

  const addPattern = () => {
    setEditedType(prev => ({
      ...prev,
      patterns: [
        ...prev.patterns,
        {
          name: '',
          pattern: '',
          required: false,
          confidence: 0.8,
          examples: []
        }
      ]
    }))
  }

  const removePattern = (index: number) => {
    setEditedType(prev => ({
      ...prev,
      patterns: prev.patterns.filter((_, i) => i !== index)
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await onSave(editedType)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="basic">Grundeinstellungen</TabsTrigger>
          <TabsTrigger value="patterns">Erkennungsmuster</TabsTrigger>
          <TabsTrigger value="validation">Validierung</TabsTrigger>
          <TabsTrigger value="response">Antwort-Konfiguration</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="grid gap-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editedType.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Name des Dokumententyps"
              />
            </div>

            <div>
              <Label>Beschreibung</Label>
              <Textarea
                value={editedType.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Beschreibung des Dokumententyps"
              />
            </div>

            <div>
              <Label>Typ</Label>
              <Select
                value={editedType.type}
                onValueChange={(value) => handleChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Typ auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BaseContentType).map(([key, value]) => (
                    <SelectItem key={key} value={value}>
                      {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Domain</Label>
              <Input
                value={editedType.metadata.domain}
                onChange={(e) => handleMetadataChange('domain', e.target.value)}
                placeholder="Fachlicher Bereich"
              />
            </div>

            <div>
              <Label>Sub-Domain</Label>
              <Input
                value={editedType.metadata.subDomain}
                onChange={(e) => handleMetadataChange('subDomain', e.target.value)}
                placeholder="Unterkategorie"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4 mt-4">
          <Card className="p-4">
            <div className="space-y-4">
              {editedType.patterns.map((pattern, index) => (
                <div key={index} className="space-y-2 pb-4 border-b last:border-0">
                  <div className="flex items-center justify-between">
                    <Input
                      value={pattern.name}
                      onChange={(e) => handlePatternChange(index, 'name', e.target.value)}
                      placeholder="Name des Musters"
                      className="max-w-[200px]"
                    />
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Erforderlich</Label>
                      <Switch
                        checked={pattern.required}
                        onCheckedChange={(checked) => handlePatternChange(index, 'required', checked)}
                      />
                    </div>
                  </div>

                  <div>
                    <Input
                      value={pattern.pattern}
                      onChange={(e) => handlePatternChange(index, 'pattern', e.target.value)}
                      placeholder="Regex-Pattern"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label className="text-sm">Konfidenz</Label>
                      <Input
                        type="number"
                        min={0}
                        max={1}
                        step={0.1}
                        value={pattern.confidence}
                        onChange={(e) => handlePatternChange(index, 'confidence', parseFloat(e.target.value))}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePattern(index)}
                    >
                      Entfernen
                    </Button>
                  </div>
                </div>
              ))}

              <Button onClick={addPattern}>
                Muster hinzufügen
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4 mt-4">
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <Label>Verknüpfte Schemas</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {editedType.validation.schemas.map((schemaId, index) => (
                    <Badge key={index}>{schemaId}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Verknüpfte Handler</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {editedType.validation.handlers.map((handlerId, index) => (
                    <Badge key={index}>{handlerId}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Validierungsregeln</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {editedType.validation.rules.map((rule, index) => (
                    <Badge key={index}>{rule}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="response" className="space-y-4 mt-4">
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <Label>Verknüpfte Layouts</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {editedType.responseConfig.layouts.map((layoutId, index) => (
                    <Badge key={index}>{layoutId}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Standard-Layout</Label>
                <Select
                  value={editedType.responseConfig.defaultLayout}
                  onValueChange={(value) => handleChange('responseConfig', {
                    ...editedType.responseConfig,
                    defaultLayout: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Standard-Layout auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {editedType.responseConfig.layouts.map((layoutId) => (
                      <SelectItem key={layoutId} value={layoutId}>
                        {layoutId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between pt-6 border-t">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
          {onDelete && (
            <Button variant="destructive" onClick={onDelete}>
              Löschen
            </Button>
          )}
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Speichern
        </Button>
      </div>
    </div>
  )
} 