'use client'

import { useState } from 'react'
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Example } from '@/lib/types/template'

const EXAMPLE_TYPES = [
  { id: 'info', label: 'Information' },
  { id: 'service', label: 'Service' },
  { id: 'product', label: 'Produkt' },
  { id: 'event', label: 'Event' },
  { id: 'location', label: 'Standort' },
  { id: 'video', label: 'Video' },
  { id: 'link', label: 'Link' },
  { id: 'contact', label: 'Kontakt' },
  { id: 'faq', label: 'FAQ' },
  { id: 'download', label: 'Download' }
] as const

type ExampleType = typeof EXAMPLE_TYPES[number]['id']

interface ExampleEditorProps {
  onSave: (example: Example) => void
  onCancel: () => void
  initialExample?: Example
}

export function ExampleEditor({ onSave, onCancel, initialExample }: ExampleEditorProps) {
  const [example, setExample] = useState<Example>(initialExample || {
    question: '',
    answer: '',
    type: 'info',
    context: '',
    metadata: {}
  })

  const handleChange = (field: keyof Example, value: any) => {
    setExample(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleMetadataChange = (field: string, value: any) => {
    setExample(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [field]: value
      }
    }))
  }

  const getMetadataFields = (type: ExampleType) => {
    switch (type) {
      case 'service':
      case 'product':
        return [
          { field: 'price', label: 'Preis', type: 'text' },
          { field: 'available', label: 'Verfügbar', type: 'checkbox' }
        ]
      case 'event':
        return [
          { field: 'date', label: 'Datum', type: 'date' },
          { field: 'time', label: 'Zeit', type: 'time' },
          { field: 'location', label: 'Ort', type: 'text' }
        ]
      case 'location':
        return [
          { field: 'address', label: 'Adresse', type: 'text' }
        ]
      case 'video':
        return [
          { field: 'videoUrl', label: 'Video URL', type: 'text' },
          { field: 'thumbnail', label: 'Thumbnail', type: 'text' }
        ]
      case 'link':
        return [
          { field: 'url', label: 'URL', type: 'text' },
          { field: 'buttonText', label: 'Button Text', type: 'text' }
        ]
      case 'contact':
        return [
          { field: 'email', label: 'E-Mail', type: 'email' },
          { field: 'phone', label: 'Telefon', type: 'tel' }
        ]
      case 'download':
        return [
          { field: 'fileUrl', label: 'Datei URL', type: 'text' },
          { field: 'fileSize', label: 'Dateigröße', type: 'text' },
          { field: 'fileType', label: 'Dateityp', type: 'text' }
        ]
      default:
        return []
    }
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-2">
        <Label>Frage</Label>
        <Input
          value={example.question}
          onChange={(e) => handleChange('question', e.target.value)}
          placeholder="Frage eingeben..."
        />
      </div>

      <div className="space-y-2">
        <Label>Antwort</Label>
        <Textarea
          value={example.answer}
          onChange={(e) => handleChange('answer', e.target.value)}
          placeholder="Antwort eingeben..."
        />
      </div>

      <div className="space-y-2">
        <Label>Typ</Label>
        <Select
          value={example.type}
          onValueChange={(value) => handleChange('type', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Typ auswählen" />
          </SelectTrigger>
          <SelectContent>
            {EXAMPLE_TYPES.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Kontext (Optional)</Label>
        <Input
          value={example.context}
          onChange={(e) => handleChange('context', e.target.value)}
          placeholder="Zusätzlicher Kontext..."
        />
      </div>

      {/* Dynamische Metadaten-Felder basierend auf dem Typ */}
      {getMetadataFields(example.type as ExampleType).map(({ field, label, type }) => (
        <div key={field} className="space-y-2">
          <Label>{label}</Label>
          {type === 'checkbox' ? (
            <input
              type="checkbox"
              checked={!!example.metadata[field]}
              onChange={(e) => handleMetadataChange(field, e.target.checked)}
            />
          ) : (
            <Input
              type={type}
              value={example.metadata[field] || ''}
              onChange={(e) => handleMetadataChange(field, e.target.value)}
            />
          )}
        </div>
      ))}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button onClick={() => onSave(example)}>
          Speichern
        </Button>
      </div>
    </Card>
  )
} 