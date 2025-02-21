'use client'

import React from 'react'
import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, CheckCircle2, Edit2, Save, X } from "lucide-react"
import type { ContentTypeResult, ContentTypeError } from '@/lib/types/template'
import { BaseContentType, BaseContentTypes, ContentType, ContentTypeDefinition, ResponseContentType } from '@/lib/types/contentTypes'
import { ResponseContentTypes } from '@/lib/types/contentTypes'

const RESPONSE_TYPES = [
  { value: ResponseContentTypes.TEXT, label: 'Text' },
  { value: ResponseContentTypes.LIST, label: 'Liste' },
  { value: ResponseContentTypes.TABLE, label: 'Tabelle' },
  { value: ResponseContentTypes.CARD, label: 'Karte' },
  { value: ResponseContentTypes.LINK, label: 'Link' },
  { value: ResponseContentTypes.DOWNLOAD, label: 'Download' },
  { value: ResponseContentTypes.IMAGE, label: 'Bild' },
  { value: ResponseContentTypes.VIDEO, label: 'Video' },
  { value: ResponseContentTypes.CUSTOM, label: 'Benutzerdefiniert' },
  { value: ResponseContentTypes.WARNING, label: 'Warnung' },
  { value: ResponseContentTypes.SUCCESS, label: 'Erfolg' },
  { value: ResponseContentTypes.STRUCTURED, label: 'Strukturiert' },
  { value: ResponseContentTypes.MEDIA, label: 'Medien' },
  { value: ResponseContentTypes.INTERACTIVE, label: 'Interaktiv' },
  { value: ResponseContentTypes.COMPOSITE, label: 'Zusammengesetzt' }
]

interface ContentTypeEditorProps {
  templateId: string
  contentTypes: ContentTypeResult[]
  onUpdate: (types: ContentTypeResult[]) => void
  type: ContentType
  error?: ContentTypeError
  metadata?: Record<string, any>
  onChange: (type: ContentType) => void
  onMetadataChange: (metadata: Record<string, any>) => void
}

const validateContentType = (type: string): type is BaseContentType => {
  return Object.values(BaseContentTypes).includes(type as BaseContentType)
}

const validateResponseType = (type: string): type is ResponseContentType => {
  return Object.values(ResponseContentTypes).includes(type as ResponseContentType)
}

const getResponseTypeIcon = (type: string) => {
  if (!validateResponseType(type)) return null

  switch (type) {
    case ResponseContentTypes.SUCCESS:
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case ResponseContentTypes.WARNING:
      return <AlertCircle className="h-4 w-4 text-yellow-500" />
    default:
      return null
  }
}

export const ContentTypeEditor: React.FC<ContentTypeEditorProps> = ({
  templateId,
  contentTypes,
  onUpdate,
  type,
  error,
  metadata = {},
  onChange,
  onMetadataChange
}) => {
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

  const handleTypeChange = (newType: string) => {
    if (validateContentType(newType)) {
      onChange(newType)
    }
  }

  const handleMetadataChange = (key: string, value: any) => {
    onMetadataChange({
      ...metadata,
      [key]: value
    })
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
                    {RESPONSE_TYPES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
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
                      {getResponseTypeIcon(type.type)}
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

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Content-Typ
        </label>
        <select
          value={type}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          {RESPONSE_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {error.message}
              </h3>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Metadaten
          </label>
          <div className="mt-1">
            <Textarea
              value={JSON.stringify(metadata, null, 2)}
              onChange={(e) => {
                try {
                  const newMetadata = JSON.parse(e.target.value)
                  onMetadataChange(newMetadata)
                } catch (error) {
                  // Ignoriere ungültiges JSON
                }
              }}
              className="h-32"
            />
          </div>
        </div>
      </div>
    </div>
  )
} 