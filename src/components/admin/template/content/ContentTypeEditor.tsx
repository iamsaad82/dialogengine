'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, CheckCircle2, Edit2, Save, X } from "lucide-react"
import type { ContentTypeResult, ContentTypeError, ResponseType } from '@/lib/types/template'

const RESPONSE_TYPES = [
  { value: 'info', label: 'Information' },
  { value: 'service', label: 'Service' },
  { value: 'product', label: 'Produkt' },
  { value: 'event', label: 'Event' },
  { value: 'location', label: 'Standort' },
  { value: 'video', label: 'Video' },
  { value: 'link', label: 'Link' },
  { value: 'contact', label: 'Kontakt' },
  { value: 'faq', label: 'FAQ' },
  { value: 'download', label: 'Download' }
] as const

interface ContentTypeEditorProps {
  templateId: string
  contentTypes: ContentTypeResult[]
  onUpdate: (types: ContentTypeResult[]) => void
}

export function ContentTypeEditor({ templateId, contentTypes, onUpdate }: ContentTypeEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editedType, setEditedType] = useState<ContentTypeResult | null>(null)

  const startEditing = (index: number) => {
    setEditingIndex(index)
    setEditedType(contentTypes[index])
  }

  const cancelEditing = () => {
    setEditingIndex(null)
    setEditedType(null)
  }

  const saveEditing = async () => {
    if (editingIndex === null || !editedType) return

    try {
      const response = await fetch(`/api/templates/${templateId}/content-types/${editedType.type}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedType)
      })

      if (!response.ok) {
        throw new Error('Fehler beim Speichern')
      }

      const updatedTypes = [...contentTypes]
      updatedTypes[editingIndex] = editedType
      onUpdate(updatedTypes)
      cancelEditing()
    } catch (error) {
      console.error('Fehler beim Speichern des Content-Typs:', error)
    }
  }

  const getErrorBadgeColor = (error: ContentTypeError) => {
    switch (error.type) {
      case 'unknown_type':
        return 'bg-red-500'
      case 'low_confidence':
        return 'bg-yellow-500'
      case 'missing_metadata':
        return 'bg-orange-500'
      case 'invalid_format':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-4">
      {contentTypes.map((type, index) => (
        <Card key={index} className="p-4">
          {editingIndex === index ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select
                  value={editedType?.type}
                  onValueChange={(value) =>
                    setEditedType(prev => prev ? { ...prev, type: value as ResponseType } : null)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Typ auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESPONSE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Titel</Label>
                <Input
                  value={editedType?.metadata.title || ''}
                  onChange={(e) =>
                    setEditedType(prev =>
                      prev ? {
                        ...prev,
                        metadata: { ...prev.metadata, title: e.target.value }
                      } : null
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Textarea
                  value={editedType?.metadata.description || ''}
                  onChange={(e) =>
                    setEditedType(prev =>
                      prev ? {
                        ...prev,
                        metadata: { ...prev.metadata, description: e.target.value }
                      } : null
                    )
                  }
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={cancelEditing}>
                  <X className="h-4 w-4 mr-2" />
                  Abbrechen
                </Button>
                <Button onClick={saveEditing}>
                  <Save className="h-4 w-4 mr-2" />
                  Speichern
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{type.metadata.title || type.type}</h3>
                  <Badge variant="secondary">
                    {RESPONSE_TYPES.find(t => t.value === type.type)?.label || type.type}
                  </Badge>
                  {type.error ? (
                    <Badge
                      className={getErrorBadgeColor(type.error)}
                    >
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {type.error.message}
                    </Badge>
                  ) : (
                    <Badge className="bg-green-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Validiert
                    </Badge>
                  )}
                </div>
                {type.metadata.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {type.metadata.description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => startEditing(index)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
} 