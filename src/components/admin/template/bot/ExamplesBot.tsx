'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Example, ResponseType, ExampleMetadata } from "@/lib/types/template"
import { Trash2, Eye, MessageSquare, Link, FileText, Phone, HelpCircle, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { BotResponsePreview } from '@/components/preview/BotResponsePreview'
import { useState, useRef } from 'react'
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import type { ExamplesBotConfig } from '@/lib/types/template'
import { ExampleEditor } from '../examples/ExampleEditor'

type MetadataFieldType = 'url' | 'text' | 'datetime-local' | 'checkbox'

type ExampleMetadataKey = keyof ExampleMetadata

type MetadataField = {
  field: ExampleMetadataKey
  label: string
  type: MetadataFieldType
}

type ResponseTypeOption = {
  value: ResponseType
  label: string
}

const RESPONSE_TYPES = [
  { 
    value: 'info', 
    label: 'Text-Antwort',
    icon: MessageSquare,
    description: 'Einfache Textantwort ohne Zusätze'
  },
  { 
    value: 'link', 
    label: 'Link/Button',
    icon: Link,
    description: 'Antwort mit klickbarem Button'
  },
  { 
    value: 'download', 
    label: 'Dokument',
    icon: FileText,
    description: 'Download von PDF oder anderen Dateien'
  },
  { 
    value: 'contact', 
    label: 'Kontakt',
    icon: Phone,
    description: 'Kontaktdaten oder Formular'
  },
  { 
    value: 'faq', 
    label: 'FAQ',
    icon: HelpCircle,
    description: 'Mit verwandten Fragen'
  }
]

interface TypeSelectorProps {
  value: string
  onChange: (value: string) => void
}

function TypeSelector({ value, onChange }: TypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {RESPONSE_TYPES.map((type) => {
        const Icon = type.icon
        return (
          <button
            key={type.value}
            onClick={() => onChange(type.value)}
            className={cn(
              "flex flex-col items-center p-4 rounded-lg border-2 transition-all",
              "hover:border-primary/50 hover:bg-primary/5",
              value === type.value 
                ? "border-primary bg-primary/10" 
                : "border-transparent bg-secondary/10"
            )}
          >
            <Icon className="h-6 w-6 mb-2" />
            <span className="text-sm font-medium">{type.label}</span>
            <span className="text-xs text-muted-foreground text-center mt-1">
              {type.description}
            </span>
          </button>
        )
      })}
    </div>
  )
}

interface ExamplesBotProps {
  config: ExamplesBotConfig
  onChange: (config: ExamplesBotConfig) => void
}

export function ExamplesBot({ config, onChange }: ExamplesBotProps) {
  const [previewExample, setPreviewExample] = useState<Example | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [showEditor, setShowEditor] = useState(false)

  const addExample = (example: Example) => {
    onChange({
      ...config,
      examples: [...(config.examples || []), example]
    })
    setShowEditor(false)
  }

  const removeExample = (index: number) => {
    onChange({
      ...config,
      examples: config.examples.filter((_, i) => i !== index)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addExample({
        question: newQuestion.trim(),
        answer: '',
        type: 'info',
        context: '',
        metadata: {
          buttonText: '',
          url: '',
          image: '',
          date: '',
          time: '',
          sessions: '',
          available: false,
          title: '',
          address: '',
          price: '',
          fileType: '',
          fileSize: '',
          videoUrl: '',
          relatedQuestions: ''
        }
      })
    }
  }

  const getMetadataFields = (type: ResponseType): MetadataField[] => {
    switch (type) {
      case 'service':
        return [
          { field: 'buttonText', label: 'Button-Text', type: 'text' },
          { field: 'url', label: 'Button-URL', type: 'url' },
          { field: 'image', label: 'Bild-URL (Optional)', type: 'url' }
        ]
      case 'product':
        return [
          { field: 'image', label: 'Produkt-Bild', type: 'url' },
          { field: 'price', label: 'Preis', type: 'text' },
          { field: 'url', label: 'Mehr Info URL', type: 'url' },
          { field: 'buttonText', label: 'Button-Text', type: 'text' }
        ]
      case 'event':
        return [
          { field: 'title', label: 'Kurstitel', type: 'text' },
          { field: 'address', label: 'Ort', type: 'text' },
          { field: 'date', label: 'Startdatum (z.B. 30.04.2025)', type: 'text' },
          { field: 'time', label: 'Uhrzeit (z.B. 18:00 - 19:00 Uhr)', type: 'text' },
          { field: 'sessions', label: 'Anzahl der Termine', type: 'text' },
          { field: 'available', label: 'Plätze verfügbar', type: 'checkbox' },
          { field: 'buttonText', label: 'Button-Text', type: 'text' },
          { field: 'url', label: 'Anmelde-URL', type: 'url' }
        ]
      case 'location':
        return [
          { field: 'address', label: 'Adresse', type: 'text' },
          { field: 'url', label: 'Maps-URL', type: 'url' },
          { field: 'buttonText', label: 'Button-Text', type: 'text' }
        ]
      case 'video':
        return [
          { field: 'title', label: 'Video-Titel', type: 'text' },
          { field: 'videoUrl', label: 'Video-URL', type: 'url' },
          { field: 'image', label: 'Vorschaubild-URL', type: 'url' },
          { field: 'buttonText', label: 'Button-Text', type: 'text' }
        ]
      case 'link':
        return [
          { field: 'url', label: 'Link-URL', type: 'url' },
          { field: 'buttonText', label: 'Link-Text', type: 'text' },
          { field: 'image', label: 'Vorschaubild (Optional)', type: 'url' }
        ]
      case 'contact':
        return [
          { field: 'buttonText', label: 'Kontakt-Name', type: 'text' },
          { field: 'url', label: 'Kontakt-URL/Tel/Mail', type: 'url' }
        ]
      case 'faq':
        return [
          { field: 'relatedQuestions', label: 'Verwandte Fragen (Eine pro Zeile)', type: 'text' }
        ]
      case 'download':
        return [
          { field: 'url', label: 'Download-URL', type: 'url' },
          { field: 'buttonText', label: 'Download-Text', type: 'text' },
          { field: 'fileSize', label: 'Dateigröße', type: 'text' },
          { field: 'fileType', label: 'Dateityp', type: 'text' }
        ]
      default:
        return []
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Beispiele</Label>
        <div className="grid grid-cols-1 gap-4 mt-2">
          {config.examples?.map((example, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{example.question}</h3>
                  <p className="text-sm text-gray-500">{example.answer}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary">
                      {example.type}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => removeExample(index)}
                >
                  Entfernen
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {showEditor ? (
        <ExampleEditor
          onSave={addExample}
          onCancel={() => setShowEditor(false)}
        />
      ) : (
        <Button onClick={() => setShowEditor(true)}>
          Beispiel hinzufügen
        </Button>
      )}
    </div>
  )
} 