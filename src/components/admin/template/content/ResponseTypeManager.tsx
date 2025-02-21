'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { MessageBubble } from "@/components/chat/MessageBubble"
import { Plus, Settings2, Eye, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { ResponseType } from '@/lib/types/common'
import type { Template } from '@/lib/types/template'

// Beispiel-Antworten für die Vorschau
const PREVIEW_RESPONSES: Record<string, any> = {
  contact: {
    question: "Wer ist mein Ansprechpartner für Versicherungsfragen?",
    response: {
      role: 'assistant',
      content: "Ihr Ansprechpartner für Versicherungsfragen ist:",
      metadata: {
        type: 'contact',
        icon: 'contact',
        title: 'Persönlicher Ansprechpartner',
        mainTitle: 'Max Mustermann',
        subtitle: 'Versicherungsberater',
        metadata: {
          photo: '/examples/profile.jpg',
          phone: '+49 123 456789',
          email: 'max.mustermann@example.com',
          hours: 'Mo-Fr 9:00-17:00',
          department: 'Versicherungsberatung'
        }
      }
    }
  },
  shop: {
    question: "Wo finde ich Geschäfte für Sportbekleidung?",
    response: {
      role: 'assistant',
      content: "Hier sind die Sport-Shops in unserem Center:",
      metadata: {
        type: 'location',
        icon: 'shopping',
        title: 'Sport-Shops',
        items: [
          {
            name: 'SportXpress',
            floor: 'EG',
            hours: '10:00-20:00',
            currentOffers: '20% auf Laufschuhe',
            logo: '/examples/shop1.jpg'
          },
          {
            name: 'FitnessWorld',
            floor: '1. OG',
            hours: '09:00-21:00',
            currentOffers: 'Sale bis zu 50%',
            logo: '/examples/shop2.jpg'
          }
        ]
      }
    }
  }
}

export interface ResponseFormat {
  id: string
  type: ResponseType
  name: string
  enabled: boolean
  metadata: Record<string, boolean>
  settings?: Record<string, any>
  config?: {
    template?: string
    rules?: Array<{
      field: string
      condition: string
      value: any
    }>
    formatting?: {
      useMarkdown: boolean
      includeMetadata: boolean
      customTemplate?: string
    }
  }
}

interface ResponseTypeManagerProps {
  template: Template
  onUpdate: (formats: ResponseFormat[]) => void
}

const DEFAULT_METADATA_FIELDS = {
  title: true,
  description: true,
  icon: true
}

const RESPONSE_TYPE_OPTIONS = [
  { value: 'text' as const, label: 'Text', defaultFields: { ...DEFAULT_METADATA_FIELDS } },
  { value: 'info' as const, label: 'Information', defaultFields: { ...DEFAULT_METADATA_FIELDS } },
  { value: 'contact' as const, label: 'Kontakt', defaultFields: { ...DEFAULT_METADATA_FIELDS, phone: true, email: true, hours: true } },
  { value: 'location' as const, label: 'Standort', defaultFields: { ...DEFAULT_METADATA_FIELDS, address: true, hours: true, map: true } },
  { value: 'product' as const, label: 'Produkt', defaultFields: { ...DEFAULT_METADATA_FIELDS, price: true, image: true, availability: true } },
  { value: 'service' as const, label: 'Dienstleistung', defaultFields: { ...DEFAULT_METADATA_FIELDS, duration: true, price: true } },
  { value: 'event' as const, label: 'Veranstaltung', defaultFields: { ...DEFAULT_METADATA_FIELDS, date: true, time: true, location: true } },
  { value: 'download' as const, label: 'Download', defaultFields: { ...DEFAULT_METADATA_FIELDS, fileSize: true, fileType: true, url: true } },
  { value: 'link' as const, label: 'Link', defaultFields: { ...DEFAULT_METADATA_FIELDS, url: true, external: true } },
  { value: 'faq' as const, label: 'FAQ', defaultFields: { ...DEFAULT_METADATA_FIELDS, question: true, category: true } },
  { value: 'video' as const, label: 'Video', defaultFields: { ...DEFAULT_METADATA_FIELDS, url: true, duration: true, thumbnail: true } }
]

export function ResponseTypeManager({ template, onUpdate }: ResponseTypeManagerProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('templates')
  const [formats, setFormats] = useState<ResponseFormat[]>([])
  const [selectedFormat, setSelectedFormat] = useState<ResponseFormat | null>(null)
  const [loading, setLoading] = useState(true)

  // Lade die Response-Formate
  const loadFormats = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/templates/${template.id}/response-types`)
      if (!response.ok) throw new Error('Fehler beim Laden')
      const data = await response.json()
      setFormats(data)
    } catch (error) {
      console.error('Fehler beim Laden der Response-Typen:', error)
      toast({
        title: 'Fehler',
        description: 'Die Response-Typen konnten nicht geladen werden.'
      })
    } finally {
      setLoading(false)
    }
  }

  // Speichere ein Format
  const saveFormat = async (format: ResponseFormat) => {
    try {
      const response = await fetch(`/api/templates/${template.id}/response-types/${format.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(format)
      })

      if (!response.ok) throw new Error('Fehler beim Speichern')

      const updatedFormat = await response.json()
      setFormats(prev => prev.map(f => f.id === updatedFormat.id ? updatedFormat : f))
      onUpdate(formats)

      toast({
        title: 'Gespeichert',
        description: 'Die Änderungen wurden erfolgreich gespeichert.'
      })
    } catch (error) {
      console.error('Fehler beim Speichern des Formats:', error)
      toast({
        title: 'Fehler',
        description: 'Die Änderungen konnten nicht gespeichert werden.'
      })
    }
  }

  // Erstelle ein neues Format
  const createFormat = async (format: Omit<ResponseFormat, 'id'>) => {
    try {
      const response = await fetch(`/api/templates/${template.id}/response-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(format)
      })

      if (!response.ok) throw new Error('Fehler beim Erstellen')

      const newFormat = await response.json()
      setFormats(prev => [...prev, newFormat])
      onUpdate([...formats, newFormat])

      toast({
        title: 'Erstellt',
        description: 'Das Format wurde erfolgreich erstellt.'
      })
    } catch (error) {
      console.error('Fehler beim Erstellen des Formats:', error)
      toast({
        title: 'Fehler',
        description: 'Das Format konnte nicht erstellt werden.'
      })
    }
  }

  // Lösche ein Format
  const deleteFormat = async (format: ResponseFormat) => {
    try {
      const response = await fetch(`/api/templates/${template.id}/response-types/${format.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Fehler beim Löschen')

      setFormats(prev => prev.filter(f => f.id !== format.id))
      onUpdate(formats.filter(f => f.id !== format.id))

      toast({
        title: 'Gelöscht',
        description: 'Das Format wurde erfolgreich gelöscht.'
      })
    } catch (error) {
      console.error('Fehler beim Löschen des Formats:', error)
      toast({
        title: 'Fehler',
        description: 'Das Format konnte nicht gelöscht werden.'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Antwortformate</h2>
        <Button onClick={() => setSelectedFormat(null)}>
          <Plus className="h-4 w-4 mr-2" />
          Neues Format
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {formats.map((format) => (
          <Card 
            key={format.id}
            className="cursor-pointer hover:border-primary transition-colors"
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{format.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedFormat(format)}
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteFormat(format)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Typ:</span>
                  <span className="text-sm font-medium">
                    {RESPONSE_TYPE_OPTIONS.find(opt => opt.value === format.type)?.label || format.type}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Felder:</span>
                  <span className="text-sm font-medium">{Object.keys(format.metadata || {}).length}</span>
                </div>
                {format.config?.template && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Template:</span>
                    <span className="text-sm font-medium">Angepasst</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 