'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import type { ContentType } from '@/lib/types/contentTypes'
import type { SchemaDefinition } from '@/lib/types/schema'

interface ResponseTypeEditorProps {
  responseTypes: Array<{
    type: ContentType
    schema: SchemaDefinition
    templates: string[]
  }>
  onChange: (responseTypes: Array<{
    type: ContentType
    schema: SchemaDefinition
    templates: string[]
  }>) => void
}

export function ResponseTypeEditor({ responseTypes = [], onChange }: ResponseTypeEditorProps) {
  const [newType, setNewType] = useState<{
    type: ContentType
    schema: SchemaDefinition
    templates: string[]
  }>({
    type: 'text',
    schema: {
      type: 'text',
      properties: {},
      required: []
    },
    templates: []
  })

  const handleAdd = () => {
    onChange([...responseTypes, newType])
    setNewType({
      type: 'text',
      schema: {
        type: 'text',
        properties: {},
        required: []
      },
      templates: []
    })
  }

  const handleRemove = (index: number) => {
    const newTypes = [...responseTypes]
    newTypes.splice(index, 1)
    onChange(newTypes)
  }

  const handleUpdate = (index: number, field: string, value: any) => {
    const newTypes = [...responseTypes]
    newTypes[index] = {
      ...newTypes[index],
      [field]: value
    }
    onChange(newTypes)
  }

  const safeResponseTypes = Array.isArray(responseTypes) ? responseTypes : []

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {safeResponseTypes.map((type, index) => (
          <div key={index} className="flex items-start space-x-4 p-4 border rounded-lg">
            <div className="flex-1 space-y-4">
              <div>
                <Label>Typ</Label>
                <Select
                  value={type.type}
                  onValueChange={(value) => handleUpdate(index, 'type', value as ContentType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Typ auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="list">Liste</SelectItem>
                    <SelectItem value="table">Tabelle</SelectItem>
                    <SelectItem value="card">Karte</SelectItem>
                    <SelectItem value="link">Link</SelectItem>
                    <SelectItem value="download">Download</SelectItem>
                    <SelectItem value="image">Bild</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="custom">Benutzerdefiniert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(index)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-4 p-4 border rounded-lg">
        <h3 className="font-medium">Neuen Antworttyp hinzufügen</h3>
        <div className="space-y-4">
          <div>
            <Label>Typ</Label>
            <Select
              value={newType.type}
              onValueChange={(value) => setNewType({ ...newType, type: value as ContentType })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Typ auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="list">Liste</SelectItem>
                <SelectItem value="table">Tabelle</SelectItem>
                <SelectItem value="card">Karte</SelectItem>
                <SelectItem value="link">Link</SelectItem>
                <SelectItem value="download">Download</SelectItem>
                <SelectItem value="image">Bild</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="custom">Benutzerdefiniert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAdd} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Hinzufügen
          </Button>
        </div>
      </div>
    </div>
  )
}