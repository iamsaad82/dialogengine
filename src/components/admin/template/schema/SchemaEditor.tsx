'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2 } from "lucide-react"
import type { ExtractionSchema } from '@/lib/types/schema'
import type { DocumentPattern, MetadataDefinition, MetadataFieldType } from '@/lib/types/common'

interface SchemaEditorProps {
  schema: ExtractionSchema
  onSave: (schema: ExtractionSchema) => void
  onCancel: () => void
  onDelete?: () => void
}

const getFieldTypeLabel = (type: MetadataFieldType): string => {
  const typeMap: Record<MetadataFieldType, string> = {
    'string': 'Text',
    'number': 'Zahl',
    'boolean': 'Ja/Nein',
    'array': 'Liste',
    'object': 'Objekt',
    'date': 'Datum'
  }
  return typeMap[type] || type
}

const getExtractedTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    'Health and Fitness Information': 'Gesundheits- und Fitness-Informationen',
    'Numeric Information': 'Numerische Informationen',
    'Organization Name': 'Organisationsname',
    'Image Caption and URL': 'Bildunterschrift und URL',
    'Informative Article': 'Informationsartikel',
    'Service Description': 'Servicebeschreibung',
    'AOK Branch Listing': 'AOK-Filialauflistung',
    'AOK Branches': 'AOK-Filialen',
    'Telephone numbers': 'Telefonnummern',
    'Date format': 'Datumsformat',
    'URL format': 'URL-Format',
    'Email format': 'E-Mail-Format',
    'List form': 'Listenform',
    'Hyperlinks': 'Hyperlinks',
    'Dates': 'Datumsangaben',
    'Image links': 'Bildlinks',
    'Sections with double headlines': 'Abschnitte mit Doppelüberschriften'
  }
  return typeMap[type] || type
}

export function SchemaEditor({ schema, onSave, onCancel, onDelete }: SchemaEditorProps) {
  const [editedSchema, setEditedSchema] = useState<ExtractionSchema>(schema)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleChange = (field: keyof ExtractionSchema, value: any) => {
    setEditedSchema(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handlePatternChange = (index: number, field: keyof DocumentPattern, value: any) => {
    setEditedSchema(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        patterns: prev.fields.patterns.map((pattern, i) => 
          i === index ? { ...pattern, [field]: value } : pattern
        )
      }
    }))
  }

  const handleMetadataFieldChange = (index: number, field: keyof MetadataDefinition, value: any) => {
    setEditedSchema(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        metadata: prev.fields.metadata.map((meta, i) => 
          i === index ? { ...meta, [field]: value } : meta
        )
      }
    }))
  }

  const handleDelete = async () => {
    if (!onDelete) return
    
    try {
      setIsDeleting(true)
      onDelete()
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Schema-Informationen</h3>
          {editedSchema.metadata?.generated && (
            <Badge variant="secondary">Automatisch generiert</Badge>
          )}
        </div>
        
        <Card className="p-4 space-y-4">
          <div>
            <Label>Name</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Der Name des Schemas für die interne Verwendung
            </p>
            <Input
              value={editedSchema.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="z.B. Produkt-Schema, Service-Schema"
            />
          </div>

          <div>
            <Label>Beschreibung</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Eine kurze Beschreibung des Schemas und seiner Verwendung
            </p>
            <Textarea
              value={editedSchema.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Beschreiben Sie den Zweck und die Verwendung dieses Schemas..."
            />
          </div>
        </Card>
      </div>

      {/* Erkennungsmuster */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Erkennungsmuster</h3>
        <Card className="p-4">
          <div className="space-y-4">
            {editedSchema.fields.patterns.map((pattern, index) => (
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
                    placeholder="Regulärer Ausdruck oder Muster"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Confidence: {Math.round(pattern.confidence * 100)}%
                  </p>
                </div>

                {pattern.examples?.length > 0 && (
                  <div className="mt-2">
                    <Label className="text-sm">Beispiele aus dem Dokument</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {pattern.examples.map((example, i) => (
                        <Badge key={i} variant="outline">{example}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Metadaten-Felder */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Metadaten-Felder</h3>
        <Card className="p-4">
          <div className="space-y-4">
            {editedSchema.fields.metadata.map((field, index) => (
              <div key={index} className="space-y-2 pb-4 border-b last:border-0">
                <div className="flex items-center justify-between">
                  <Input
                    value={field.name}
                    onChange={(e) => handleMetadataFieldChange(index, 'name', e.target.value)}
                    placeholder="Name des Feldes"
                    className="max-w-[200px]"
                  />
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Erforderlich</Label>
                    <Switch
                      checked={field.required}
                      onCheckedChange={(checked) => handleMetadataFieldChange(index, 'required', checked)}
                    />
                  </div>
                </div>

                <div>
                  <Input
                    value={field.description || ''}
                    onChange={(e) => handleMetadataFieldChange(index, 'description', e.target.value)}
                    placeholder="Beschreibung des Feldes"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Typ: {getFieldTypeLabel(field.type)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {editedSchema.metadata?.extractedTypes && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Erkannte Inhaltstypen</h3>
          <Card className="p-4">
            <div className="flex flex-wrap gap-2">
              {editedSchema.metadata.extractedTypes.map((type, index) => (
                <Badge 
                  key={index} 
                  variant="secondary"
                  className="text-sm flex items-center gap-1"
                >
                  {getExtractedTypeLabel(type.type)}
                  <span className="opacity-60">
                    {Math.round(type.confidence * 100)}% Übereinstimmung
                  </span>
                </Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="flex justify-between gap-4">
        <Button 
          variant="destructive" 
          onClick={handleDelete}
          disabled={isDeleting || !onDelete}
          className="flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          {isDeleting ? 'Wird gelöscht...' : 'Löschen'}
        </Button>
        <div className="flex gap-4">
          <Button variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button onClick={() => onSave(editedSchema)}>
            Speichern
          </Button>
        </div>
      </div>
    </div>
  )
} 