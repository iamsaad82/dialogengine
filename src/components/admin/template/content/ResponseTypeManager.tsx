import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { MessageBubble } from "@/components/chat/MessageBubble"
import { Plus, Settings2, Eye } from "lucide-react"
import type { ResponseType, Template, ParsedBranding } from '@/lib/schemas/template'

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

interface ResponseFormat {
  id: string
  name: string
  type: ResponseType
  metadata: Record<string, boolean>
}

interface ExtendedTemplate extends Template {
  responses?: {
    templates: ResponseFormat[]
  }
}

interface ResponseTypeManagerProps {
  template: ExtendedTemplate
  onUpdate: (template: ExtendedTemplate) => void
}

// Konvertiere Template-Branding zu ParsedBranding
const convertBranding = (template: Template): ParsedBranding => {
  try {
    // Wenn jsonBranding ein String ist, parse es
    const branding = typeof template.jsonBranding === 'string' 
      ? JSON.parse(template.jsonBranding)
      : template.jsonBranding || {}

    // Fallback-Werte für den Fall, dass Eigenschaften fehlen
    return {
      primaryColor: branding?.primaryColor || '#000000',
      secondaryColor: branding?.secondaryColor || '#666666',
      backgroundColor: branding?.backgroundColor || '#ffffff',
      textColor: branding?.textColor || '#000000',
      logo: branding?.logo || '',
      font: branding?.font || 'Inter'
    }
  } catch (error) {
    // Fallback-Werte im Fehlerfall
    console.warn('Fehler beim Parsen des Brandings:', error)
    return {
      primaryColor: '#000000',
      secondaryColor: '#666666',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      logo: '',
      font: 'Inter'
    }
  }
}

const DEFAULT_METADATA_FIELDS = {
  title: true,
  description: true,
  icon: true
}

const RESPONSE_TYPE_OPTIONS = [
  { value: 'info', label: 'Information', defaultFields: { ...DEFAULT_METADATA_FIELDS } },
  { value: 'contact', label: 'Kontakt', defaultFields: { ...DEFAULT_METADATA_FIELDS, phone: true, email: true, hours: true } },
  { value: 'location', label: 'Standort', defaultFields: { ...DEFAULT_METADATA_FIELDS, address: true, hours: true, map: true } },
  { value: 'product', label: 'Produkt', defaultFields: { ...DEFAULT_METADATA_FIELDS, price: true, image: true, availability: true } },
  { value: 'service', label: 'Dienstleistung', defaultFields: { ...DEFAULT_METADATA_FIELDS, duration: true, price: true } },
  { value: 'event', label: 'Veranstaltung', defaultFields: { ...DEFAULT_METADATA_FIELDS, date: true, time: true, location: true } },
  { value: 'download', label: 'Download', defaultFields: { ...DEFAULT_METADATA_FIELDS, fileSize: true, fileType: true, url: true } },
  { value: 'link', label: 'Link', defaultFields: { ...DEFAULT_METADATA_FIELDS, url: true, external: true } },
  { value: 'faq', label: 'FAQ', defaultFields: { ...DEFAULT_METADATA_FIELDS, question: true, category: true } },
  { value: 'video', label: 'Video', defaultFields: { ...DEFAULT_METADATA_FIELDS, url: true, duration: true, thumbnail: true } }
] as const

export function ResponseTypeManager({ template, onUpdate }: ResponseTypeManagerProps) {
  const [activeTab, setActiveTab] = useState('templates')
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
  const [previewType, setPreviewType] = useState<string>('contact')
  const [showNewFormatDialog, setShowNewFormatDialog] = useState(false)
  const [newFormat, setNewFormat] = useState<Partial<ResponseFormat>>({
    type: 'info',
    name: '',
    metadata: DEFAULT_METADATA_FIELDS
  })

  // Vorhandene Response-Formate laden oder Defaults verwenden
  const [responseFormats, setResponseFormats] = useState<ResponseFormat[]>(
    template.responses?.templates || []
  )

  const handleFormatChange = (format: ResponseFormat) => {
    // Format aktualisieren
    const updatedFormats = responseFormats.map(f => 
      f.id === format.id ? format : f
    )
    setResponseFormats(updatedFormats)
    
    // Template aktualisieren
    onUpdate({
      ...template,
      responses: {
        ...template.responses,
        templates: updatedFormats
      }
    })
  }

  const handleCreateFormat = () => {
    if (!newFormat.name || !newFormat.type) return

    const format: ResponseFormat = {
      id: crypto.randomUUID(),
      name: newFormat.name,
      type: newFormat.type as ResponseType,
      metadata: newFormat.metadata || DEFAULT_METADATA_FIELDS
    }

    const updatedFormats = [...responseFormats, format]
    setResponseFormats(updatedFormats)
    
    onUpdate({
      ...template,
      responses: {
        ...template.responses,
        templates: updatedFormats
      }
    })

    setShowNewFormatDialog(false)
    setNewFormat({
      type: 'info',
      name: '',
      metadata: DEFAULT_METADATA_FIELDS
    })
  }

  const handleTypeChange = (type: ResponseType) => {
    const option = RESPONSE_TYPE_OPTIONS.find(opt => opt.value === type)
    setNewFormat({
      ...newFormat,
      type,
      metadata: option?.defaultFields || DEFAULT_METADATA_FIELDS
    })
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Antwortformate
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Vorschau
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {responseFormats.map((format) => (
              <Card 
                key={format.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedFormat(format.id)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{format.name}</CardTitle>
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
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card 
              className="cursor-pointer hover:border-primary transition-colors border-dashed"
              onClick={() => setShowNewFormatDialog(true)}
            >
              <CardHeader className="flex items-center justify-center h-full">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </CardHeader>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live-Vorschau</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Button 
                    variant={previewType === 'contact' ? 'default' : 'outline'}
                    onClick={() => setPreviewType('contact')}
                  >
                    Ansprechpartner
                  </Button>
                  <Button 
                    variant={previewType === 'shop' ? 'default' : 'outline'}
                    onClick={() => setPreviewType('shop')}
                  >
                    Shop-Listing
                  </Button>
                </div>

                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="mb-4 p-3 bg-white rounded border">
                    <p className="text-sm text-muted-foreground">
                      Beispielfrage: {PREVIEW_RESPONSES[previewType].question}
                    </p>
                  </div>
                  <MessageBubble
                    message={PREVIEW_RESPONSES[previewType].response}
                    branding={convertBranding(template)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showNewFormatDialog && (
        <Card>
          <CardHeader>
            <CardTitle>Neues Antwortformat erstellen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Name des Formats</Label>
                <Input 
                  value={newFormat.name}
                  onChange={(e) => setNewFormat({ ...newFormat, name: e.target.value })}
                  placeholder="z.B. Kontaktperson oder Produktinfo"
                />
              </div>

              <div>
                <Label>Typ</Label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={newFormat.type}
                  onChange={(e) => handleTypeChange(e.target.value as ResponseType)}
                >
                  {RESPONSE_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewFormatDialog(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleCreateFormat}
                  disabled={!newFormat.name || !newFormat.type}
                >
                  Format erstellen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedFormat && (
        <Card>
          <CardHeader>
            <CardTitle>Format bearbeiten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-8">
              {/* Format-Editor */}
              <div className="space-y-4">
                <div>
                  <Label>Name des Formats</Label>
                  <Input 
                    value={responseFormats.find(f => f.id === selectedFormat)?.name || ''}
                    onChange={(e) => {
                      const format = responseFormats.find(f => f.id === selectedFormat)
                      if (format) {
                        handleFormatChange({
                          ...format,
                          name: e.target.value
                        })
                      }
                    }}
                  />
                </div>

                <div>
                  <Label>Verfügbare Felder</Label>
                  <div className="space-y-2">
                    {Object.entries(responseFormats.find(f => f.id === selectedFormat)?.metadata || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm">{key}</span>
                        <Switch 
                          checked={Boolean(value)}
                          onCheckedChange={(checked) => {
                            const format = responseFormats.find(f => f.id === selectedFormat)
                            if (format) {
                              handleFormatChange({
                                ...format,
                                metadata: {
                                  ...format.metadata,
                                  [key]: checked
                                }
                              })
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live-Vorschau des bearbeiteten Formats */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <MessageBubble
                  message={{
                    role: 'assistant',
                    content: "Vorschau des bearbeiteten Formats",
                    metadata: responseFormats.find(f => f.id === selectedFormat)
                  }}
                  branding={convertBranding(template)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 