'use client'

import React from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MetadataDefinition, MetadataFieldType } from '@/lib/types/common'

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

  const getDefaultValueForType = (type: MetadataFieldType) => {
    switch (type) {
      case 'string':
        return ''
      case 'number':
        return 0
      case 'boolean':
        return false
      case 'array':
        return []
      case 'object':
        return {}
      case 'date':
        return new Date()
      default:
        return ''
    }
  }

  const addMetadata = () => {
    onChange([
      ...metadata,
      {
        name: '',
        type: 'string' as MetadataFieldType,
        required: false,
        value: '',
        description: ''
      }
    ])
  }

  const removeMetadata = (index: number) => {
    const updatedMetadata = metadata.filter((_, i) => i !== index)
    onChange(updatedMetadata)
  }

  const handleTypeChange = (index: number, type: MetadataFieldType) => {
    const updatedMetadata = [...metadata]
    updatedMetadata[index] = {
      ...updatedMetadata[index],
      type,
      value: getDefaultValueForType(type)
    }
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
                onValueChange={(value) => handleTypeChange(index, value as MetadataFieldType)}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Wert</Label>
              {item.type === 'boolean' ? (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={item.value as boolean}
                    onChange={(e) => handleMetadataChange(index, 'value', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label>Aktiviert</Label>
                </div>
              ) : item.type === 'date' ? (
                <Input
                  type="date"
                  value={item.value instanceof Date ? item.value.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleMetadataChange(index, 'value', new Date(e.target.value))}
                />
              ) : item.type === 'array' ? (
                <Input
                  value={Array.isArray(item.value) ? item.value.join(', ') : ''}
                  onChange={(e) => handleMetadataChange(index, 'value', e.target.value.split(',').map(s => s.trim()))}
                  placeholder="Komma-getrennte Werte"
                />
              ) : (
                <Input
                  type={item.type === 'number' ? 'number' : 'text'}
                  value={item.value?.toString() || ''}
                  onChange={(e) => handleMetadataChange(index, 'value', 
                    item.type === 'number' ? parseFloat(e.target.value) : e.target.value
                  )}
                />
              )}
            </div>

            <div>
              <Label>Beschreibung (optional)</Label>
              <Input
                value={item.description || ''}
                onChange={(e) => handleMetadataChange(index, 'description', e.target.value)}
                placeholder="Beschreibung des Feldes"
              />
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
        </div>
      ))}

      <Button onClick={addMetadata}>
        Metadaten-Feld hinzufügen
      </Button>
    </div>
  )
} 