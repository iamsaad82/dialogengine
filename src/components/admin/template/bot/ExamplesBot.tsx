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
  examples: Example[]
  onChange: (examples: Example[]) => void
}

export function ExamplesBot({ examples, onChange }: ExamplesBotProps) {
  const [previewExample, setPreviewExample] = useState<Example | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addExample = () => {
    if (!newQuestion.trim()) return

    const newExample: Example = {
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
    }
    
    const updatedExamples = [...examples, newExample]
    onChange(updatedExamples)
    setNewQuestion('') // Setze das Eingabefeld zurück
    inputRef.current?.focus() // Fokussiere das Eingabefeld wieder
  }

  const updateExample = (index: number, field: string, value: string | boolean) => {
    const updatedExamples = [...examples]
    const example = updatedExamples[index]
    
    if (!example) return

    const metadataFields = [
      'title', 'time', 'sessions', 'available', 'buttonText', 'url', 
      'address', 'date', 'image', 'videoUrl', 'price', 'fileSize', 
      'fileType', 'relatedQuestions'
    ]
    
    if (metadataFields.includes(field)) {
      updatedExamples[index] = {
        ...example,
        metadata: {
          ...example.metadata,
          [field]: value
        }
      }
    } else {
      updatedExamples[index] = {
        ...example,
        [field]: value
      }
    }

    onChange(updatedExamples)
  }

  const removeExample = (index: number) => {
    const updatedExamples = examples.filter((_, i) => i !== index)
    onChange(updatedExamples)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addExample()
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
    <div className="space-y-6">
      {/* Quick-Add Bar */}
      <div className="flex items-center gap-2 p-4 bg-secondary/10 rounded-lg">
        <Input 
          ref={inputRef}
          placeholder="Neue Frage eingeben..."
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button onClick={addExample} disabled={!newQuestion.trim()}>
          <Plus className="h-4 w-4 mr-2" />
          Hinzufügen
        </Button>
      </div>

      {/* Beispiel-Liste */}
      <div className="space-y-6">
        {examples.map((example, index) => (
          <div key={index} className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label>Frage</Label>
                  <Input
                    value={example.question}
                    onChange={(e) => updateExample(index, 'question', e.target.value)}
                    placeholder="Frage eingeben..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Antwort</Label>
                  <Textarea
                    value={example.answer}
                    onChange={(e) => updateExample(index, 'answer', e.target.value)}
                    placeholder="Antwort eingeben..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Kontext (Optional)</Label>
                  <Input
                    value={example.context}
                    onChange={(e) => updateExample(index, 'context', e.target.value)}
                    placeholder="Zusätzlicher Kontext..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Antwort-Typ</Label>
                  <TypeSelector
                    value={example.type}
                    onChange={(value) => updateExample(index, 'type', value)}
                  />
                </div>

                {/* Metadata Felder basierend auf dem Typ */}
                {getMetadataFields(example.type as ResponseType).map((field) => (
                  <div key={field.field} className="space-y-2">
                    <Label>{field.label}</Label>
                    {field.type === 'checkbox' ? (
                      <input
                        type="checkbox"
                        checked={!!example.metadata[field.field]}
                        onChange={(e) => updateExample(index, field.field, e.target.checked)}
                      />
                    ) : (
                      <Input
                        type={field.type}
                        value={example.metadata[field.field] as string}
                        onChange={(e) => updateExample(index, field.field, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setPreviewExample(example)
                    setIsPreviewOpen(true)
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeExample(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {examples.length === 0 && (
          <div className="text-center p-8 text-muted-foreground">
            Keine Beispiele vorhanden. Fügen Sie oben neue Fragen hinzu.
          </div>
        )}
      </div>

      {/* Vorschau-Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vorschau</DialogTitle>
            <DialogDescription>
              So wird die Antwort im Chat angezeigt
            </DialogDescription>
          </DialogHeader>
          {previewExample && (
            <BotResponsePreview example={previewExample} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 