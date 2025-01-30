'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ParsedBot, Example, ResponseType, ExampleMetadata } from "@/lib/types/template"
import { Trash2, Plus, Eye, AlertCircle, Loader2, InfoIcon, CheckCircle, RefreshCw, Save } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { BotResponsePreview } from '@/components/preview/BotResponsePreview'
import { useState, useEffect } from 'react'
import { updateTemplateBot } from '@/lib/actions/templates'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { z } from 'zod'

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

const RESPONSE_TYPES: ResponseTypeOption[] = [
  { 
    value: 'info', 
    label: 'Information (Einfache Textantwort)' 
  },
  { 
    value: 'service', 
    label: 'Service (Mit Aktions-Button)' 
  },
  { 
    value: 'product', 
    label: 'Produkt (Mit Bild und Details)' 
  },
  { 
    value: 'event', 
    label: 'Event (Mit Datum und Ort)' 
  },
  { 
    value: 'location', 
    label: 'Standort (Mit Adresse und Karte)' 
  },
  { 
    value: 'video', 
    label: 'Video (Mit Vorschau)' 
  },
  { 
    value: 'link', 
    label: 'Link (Mit Vorschau-Karte)' 
  },
  { 
    value: 'contact', 
    label: 'Kontakt (Mit Kontaktdaten)' 
  },
  { 
    value: 'faq', 
    label: 'FAQ (Mit Zusatzfragen)' 
  },
  { 
    value: 'download', 
    label: 'Download (Mit Datei-Details)' 
  }
]

const BOT_TYPES = [
  { value: 'examples', label: 'Beispiel-Antworten' },
  { value: 'flowise', label: 'Flowise AI' },
  { value: 'smart-search', label: 'Smart Search AI' }
]

type BotEditorProps = {
  templateId: string
  bot: ParsedBot
  onChange: (bot: ParsedBot) => void
}

interface ValidationState {
  question: boolean
  answer: boolean
  context: boolean
  isCollapsed?: boolean
}

export function BotEditor({ templateId, bot, onChange }: BotEditorProps) {
  const [previewExample, setPreviewExample] = useState<Example | null>(null)
  const [validationStates, setValidationStates] = useState<ValidationState[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [localBot, setLocalBot] = useState<ParsedBot>(() => {
    return {
      type: bot.type || 'examples',
      examples: bot.examples || [],
      flowiseId: bot.flowiseId || '',
      smartSearch: bot.smartSearch || undefined
    };
  });

  useEffect(() => {
    if (bot.examples) {
      setLocalBot(prev => ({ ...prev, examples: bot.examples || [] }))
      setValidationStates(bot.examples.map(example => ({
        question: example.question.length > 0,
        answer: example.answer.length > 0,
        context: example.context.length > 0
      })))
    }
  }, [bot])

  useEffect(() => {
    setLocalBot({
      type: bot.type || 'examples',
      examples: bot.examples || [],
      flowiseId: bot.flowiseId || '',
      smartSearch: bot.smartSearch || undefined
    });
  }, [bot]);

  const saveChanges = async () => {
    try {
      setIsSaving(true);
      console.log('Saving bot:', localBot);
      
      // Stelle sicher, dass die Examples ein Array sind
      const botToSave = {
        ...localBot,
        examples: localBot.examples || []
      };
      
      // Verwende die Server-Action zum Speichern
      const result = await updateTemplateBot(templateId, botToSave);
      console.log('Save result:', result);
      
      // Aktualisiere den Parent-Zustand
      onChange(botToSave);
      
      toast.success('Änderungen gespeichert');
    } catch (error: any) {
      console.error('Error saving bot:', error);
      toast.error(error.message || 'Fehler beim Speichern der Änderungen');
    } finally {
      setIsSaving(false);
    }
  };

  const validateExample = (example?: Example): boolean => {
    if (!example) return false;
    return example.question?.length > 0 && 
           example.answer?.length > 0;
  }

  const hasValidChanges = (bot: ParsedBot): boolean => {
    if (bot.type === 'examples') {
      return bot.examples.length > 0 && bot.examples.some(validateExample);
    }
    if (bot.type === 'flowise') {
      return !!bot.flowiseId;
    }
    if (bot.type === 'smart-search') {
      return !!bot.smartSearch?.apiKey && 
             Array.isArray(bot.smartSearch?.urls) && 
             bot.smartSearch.urls.length > 0;
    }
    return false;
  }

  const handleTypeChange = (value: 'examples' | 'flowise' | 'smart-search') => {
    const updatedBot = {
      ...localBot,
      type: value
    };
    setLocalBot(updatedBot);
  }

  const addExample = () => {
    const newExample: Example = {
      question: '',
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
    };
    
    setLocalBot(prev => ({
      ...prev,
      examples: [...prev.examples, newExample]
    }));
  }

  const updateExample = (index: number, field: string, value: string | boolean) => {
    setLocalBot(prev => {
      const newExamples = [...prev.examples];
      const example = newExamples[index];
      
      if (!example) return prev;

      // Prüfen, ob es sich um ein Metadatenfeld handelt
      const metadataFields = [
        'title', 'time', 'sessions', 'available', 'buttonText', 'url', 
        'address', 'date', 'image', 'videoUrl', 'price', 'fileSize', 
        'fileType', 'relatedQuestions'
      ];
      
      if (metadataFields.includes(field)) {
        // Metadatenfeld aktualisieren
        console.log('Updating metadata field:', field, 'with value:', value);
        newExamples[index] = {
          ...example,
          metadata: {
            ...example.metadata,
            [field]: value
          }
        };
      } else {
        // Hauptfeld aktualisieren
        console.log('Updating main field:', field, 'with value:', value);
        newExamples[index] = {
          ...example,
          [field]: value
        };
      }

      return {
        ...prev,
        examples: newExamples
      };
    });
  }

  const removeExample = (index: number) => {
    const newExamples = (localBot.examples || []).filter((_, i) => i !== index)
    const updatedBot = {
      ...localBot,
      examples: newExamples
    };
    console.log('Removing example, new bot state:', updatedBot);
    setLocalBot(updatedBot);
  }

  const getMetadataFields = (type: ResponseType): MetadataField[] => {
    switch (type) {
      case 'service':
        return [
          { field: 'buttonText', label: 'Button-Text', type: 'text' },
          { field: 'url', label: 'Button-URL', type: 'url' },
          { field: 'image', label: 'Bild-URL (Optional)', type: 'url' }
        ] as MetadataField[];
      case 'product':
        return [
          { field: 'image', label: 'Produkt-Bild', type: 'url' },
          { field: 'price', label: 'Preis', type: 'text' },
          { field: 'url', label: 'Mehr Info URL', type: 'url' },
          { field: 'buttonText', label: 'Button-Text', type: 'text' }
        ] as MetadataField[];
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
        ] as MetadataField[];
      case 'location':
        return [
          { field: 'address', label: 'Adresse', type: 'text' },
          { field: 'url', label: 'Maps-URL', type: 'url' },
          { field: 'buttonText', label: 'Button-Text', type: 'text' }
        ] as MetadataField[];
      case 'video':
        return [
          { field: 'title', label: 'Video-Titel', type: 'text' },
          { field: 'videoUrl', label: 'Video-URL', type: 'url' },
          { field: 'image', label: 'Vorschaubild-URL', type: 'url' },
          { field: 'buttonText', label: 'Button-Text', type: 'text' }
        ] as MetadataField[];
      case 'link':
        return [
          { field: 'url', label: 'Link-URL', type: 'url' },
          { field: 'buttonText', label: 'Link-Text', type: 'text' },
          { field: 'image', label: 'Vorschaubild (Optional)', type: 'url' }
        ] as MetadataField[];
      case 'contact':
        return [
          { field: 'buttonText', label: 'Kontakt-Name', type: 'text' },
          { field: 'url', label: 'Kontakt-URL/Tel/Mail', type: 'url' }
        ] as MetadataField[];
      case 'faq':
        return [
          { field: 'relatedQuestions', label: 'Verwandte Fragen (Eine pro Zeile)', type: 'text' }
        ] as MetadataField[];
      case 'download':
        return [
          { field: 'url', label: 'Download-URL', type: 'url' },
          { field: 'buttonText', label: 'Download-Text', type: 'text' },
          { field: 'fileSize', label: 'Dateigröße', type: 'text' },
          { field: 'fileType', label: 'Dateityp', type: 'text' }
        ] as MetadataField[];
      default:
        return [] as MetadataField[];
    }
  }

  const handlePreview = (example: Example) => {
    // Prevent auto-save
    setPreviewExample({...example})
    setIsPreviewOpen(true)
  }

  const handleDialogClose = () => {
    setIsPreviewOpen(false)
    setPreviewExample(null)
  }

  const handleApiKeyChange = (value: string) => {
    const updatedBot = {
      ...localBot,
      smartSearch: {
        provider: 'openai' as const,
        urls: [],
        excludePatterns: ['/admin/*', '/wp-*', '*.pdf', '/wp-json/*', '/api/*'],
        chunkSize: 300,
        temperature: 0.1,
        reindexInterval: 24,
        maxTokensPerRequest: 500,
        useCache: true,
        similarityThreshold: 0.8,
        apiKey: value,
        indexName: localBot.smartSearch?.indexName || '',
        apiEndpoint: localBot.smartSearch?.apiEndpoint || ''
      }
    }
    onChange(updatedBot)
  }

  const handleUrlsChange = (value: string) => {
    if (!localBot.smartSearch) return
    const urls = value.split('\n').filter(url => url.trim())
    const updatedBot = {
      ...localBot,
      smartSearch: {
        ...localBot.smartSearch,
        urls
      }
    }
    onChange(updatedBot)
  }

  const handleChange = (field: keyof ParsedBot, value: string) => {
    const updatedBot = {
      ...localBot,
      [field]: value
    }
    
    // Wenn der Bot-Typ auf 'flowise' gesetzt wird, setze auch die templateId
    if (field === 'type' && value === 'flowise') {
      updatedBot.templateId = templateId
    }
    
    setLocalBot(updatedBot)
    onChange(updatedBot)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Bot Konfiguration</h3>
        <div className="flex gap-2">
          {localBot.type === 'examples' && (
            <Button
              type="button"
              variant="outline"
              onClick={addExample}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Beispielfrage hinzufügen
            </Button>
          )}
          <Button
            onClick={saveChanges}
            disabled={isSaving || !hasValidChanges(localBot)}
            size="sm"
            variant={hasValidChanges(localBot) ? "default" : "outline"}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Wird gespeichert..." : hasValidChanges(localBot) ? "Änderungen speichern" : "Keine Änderungen"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="botType">Bot Typ</Label>
          <Select
            value={localBot.type}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger id="botType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="examples">Beispielfragen</SelectItem>
              <SelectItem value="flowise">Flowise</SelectItem>
              <SelectItem value="smart-search">Smart Search</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {localBot.type === 'examples' && (
          <div className="space-y-4">
            {localBot.examples.map((example, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Beispiel {index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExample(index)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor={`example-${index}-question`}>Frage</Label>
                    <Input
                      id={`example-${index}-question`}
                      value={example.question}
                      onChange={(e) => updateExample(index, 'question', e.target.value)}
                      placeholder="Frage eingeben"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`example-${index}-answer`}>Antwort</Label>
                    <Textarea
                      id={`example-${index}-answer`}
                      value={example.answer}
                      onChange={(e) => updateExample(index, 'answer', e.target.value)}
                      rows={3}
                      placeholder="Antwort eingeben"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`example-${index}-type`}>Typ</Label>
                      <Select
                        value={example.type}
                        onValueChange={(value) => updateExample(index, 'type', value)}
                      >
                        <SelectTrigger id={`example-${index}-type`}>
                          <SelectValue />
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

                    <div>
                      <Label htmlFor={`example-${index}-context`}>Kontext</Label>
                      <Input
                        id={`example-${index}-context`}
                        value={example.context}
                        onChange={(e) => updateExample(index, 'context', e.target.value)}
                        placeholder="z.B. Öffnungszeiten"
                      />
                    </div>
                  </div>

                  {getMetadataFields(example.type).map((field) => (
                    <div key={field.field} className="space-y-2">
                      <Label htmlFor={`${index}-${field.field}`}>{field.label}</Label>
                      {field.type === 'checkbox' ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`${index}-${field.field}`}
                            checked={Boolean(example.metadata[field.field])}
                            onChange={(e) => {
                              console.log('Checkbox changed:', e.target.checked);
                              updateExample(index, field.field, e.target.checked);
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </div>
                      ) : (
                        <Input
                          id={`${index}-${field.field}`}
                          type={field.type}
                          value={String(example.metadata[field.field] || '')}
                          onChange={(e) => {
                            console.log('Input changed:', field.field, e.target.value);
                            updateExample(index, field.field, e.target.value);
                          }}
                          placeholder={`${field.label} eingeben`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {localBot.type === 'flowise' && (
          <div>
            <Label htmlFor="flowiseId">Flowise Flow ID</Label>
            <Input
              id="flowiseId"
              value={localBot.flowiseId || ''}
              onChange={(e) => handleChange('flowiseId', e.target.value)}
              placeholder="Flow ID eingeben"
            />
          </div>
        )}

        {localBot.type === 'smart-search' && (
          <div className="space-y-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Website-Suche einrichten</h3>
              <HoverCard>
                <HoverCardTrigger>
                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Smart Search</h4>
                    <p className="text-sm text-muted-foreground">
                      Der Bot durchsucht Ihre Website automatisch und beantwortet Fragen basierend auf Ihren Inhalten. Die Kosten werden durch intelligentes Caching und optimierte Einstellungen niedrig gehalten.
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label>OpenAI API-Schlüssel</Label>
              <Input
                type="password"
                value={localBot.smartSearch?.apiKey || ''}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="sk-..."
              />
              <p className="text-sm text-muted-foreground">
                Ihr OpenAI API-Schlüssel wird sicher verschlüsselt gespeichert
              </p>
            </div>

            {/* Website Indexierung - Vereinfacht */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Zu durchsuchende Seiten</h4>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {}}
                  disabled={false}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Jetzt aktualisieren
                </Button>
              </div>

              {/* URLs */}
              <div className="space-y-2">
                <Label>Website-Adressen</Label>
                <Textarea
                  value={localBot.smartSearch?.urls?.join('\n') || ''}
                  onChange={(e) => handleUrlsChange(e.target.value)}
                  placeholder="https://ihre-website.de/&#10;https://ihre-website.de/blog/"
                  rows={3}
                />
                <p className="text-sm text-muted-foreground">
                  Eine URL pro Zeile. Der Bot folgt automatisch allen internen Links.
                </p>
              </div>

              {/* Status-Anzeige */}
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Automatische Aktualisierung alle 24 Stunden</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Intelligentes Caching aktiviert</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Kostenoptimierte Einstellungen</span>
                </div>
              </div>
            </div>

            {/* Erweiterte Einstellungen - Ausgeblendet für einfachere Bedienung */}
          </div>
        )}
      </div>

      {/* Vorschau Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={handleDialogClose}>
        <DialogContent 
          className="max-w-3xl"
          aria-labelledby="preview-title"
          aria-describedby="preview-description"
        >
          <DialogHeader>
            <DialogTitle id="preview-title">Antwort-Vorschau</DialogTitle>
            <DialogDescription id="preview-description">
              Diese Vorschau zeigt, wie die Antwort im Chat-Interface dargestellt wird. Die Formatierung und das Layout entsprechen der tatsächlichen Darstellung im Dialog-Modus.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {previewExample && (
              <div className="border rounded-lg p-4">
                <BotResponsePreview example={previewExample} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 