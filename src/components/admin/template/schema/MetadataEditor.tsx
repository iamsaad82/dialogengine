'use client'

import React from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MetadataDefinition } from '@/lib/types/template'

interface MetadataEditorProps {
  metadata: MetadataDefinition[]
  onChange: (metadata: MetadataDefinition[]) => void
}

export const MetadataEditor: React.FC<MetadataEditorProps> = ({
  metadata,
  onChange
}) => {
  const handleMetadataChange = (index: number, field: keyof MetadataDefinition, value: any) => {
    const updatedMetadata = [...metadata]
    updatedMetadata[index] = {
      ...updatedMetadata[index],
      [field]: value
    }
    onChange(updatedMetadata)
  }

  const addMetadata = () => {
    onChange([
      ...metadata,
      {
        name: '',
        type: 'string',
        required: false
      }
    ])
  }

  const removeMetadata = (index: number) => {
    const updatedMetadata = metadata.filter((_, i) => i !== index)
    onChange(updatedMetadata)
  }

  return (
    <div className="space-y-4">
      {metadata.map((item, index) => (
        <div key={index} className="space-y-2 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <Label>Metadaten-Feld {index + 1}</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeMetadata(index)}
            >
              Entfernen
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input
                value={item.name}
                onChange={(e) => handleMetadataChange(index, 'name', e.target.value)}
                placeholder="Name des Feldes"
              />
            </div>

            <div>
              <Label>Typ</Label>
              <Select
                value={item.type}
                onValueChange={(value) => handleMetadataChange(index, 'type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Typ auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">Text</SelectItem>
                  <SelectItem value="number">Zahl</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="date">Datum</SelectItem>
                  <SelectItem value="array">Liste</SelectItem>
                  <SelectItem value="object">Objekt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={item.required}
              onChange={(e) => handleMetadataChange(index, 'required', e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label>Pflichtfeld</Label>
          </div>

          {item.type === 'string' && (
            <div>
              <Label>Pattern (optional)</Label>
              <Input
                value={item.pattern || ''}
                onChange={(e) => handleMetadataChange(index, 'pattern', e.target.value)}
                placeholder="Regex Pattern"
              />
            </div>
          )}

          {(item.type === 'number' || item.type === 'date') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Minimum</Label>
                <Input
                  type="number"
                  value={item.validation?.min || ''}
                  onChange={(e) => handleMetadataChange(index, 'validation', {
                    ...item.validation,
                    min: parseFloat(e.target.value)
                  })}
                />
              </div>
              <div>
                <Label>Maximum</Label>
                <Input
                  type="number"
                  value={item.validation?.max || ''}
                  onChange={(e) => handleMetadataChange(index, 'validation', {
                    ...item.validation,
                    max: parseFloat(e.target.value)
                  })}
                />
              </div>
            </div>
          )}
        </div>
      ))}

      <Button onClick={addMetadata}>
        Metadaten-Feld hinzufügen
      </Button>
    </div>
  )
} 