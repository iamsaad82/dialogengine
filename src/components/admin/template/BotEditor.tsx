'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ParsedBot, Example, ResponseType } from "@/lib/schemas/template"
import { Trash2, Plus, Eye, AlertCircle, Loader2, InfoIcon, CheckCircle, RefreshCw } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { BotResponsePreview } from '@/components/preview/BotResponsePreview'
import { useState, useEffect } from 'react'
import { updateTemplateBot } from '@/lib/actions/templates'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"

type MetadataFieldType = 'url' | 'text' | 'datetime-local'

type MetadataField = {
  field: keyof NonNullable<Example['metadata']>
  label: string
  type: MetadataFieldType
}

type ResponseTypeOption = {
  value: ResponseType
  label: string
}

const RESPONSE_TYPES: ResponseTypeOption[] = [
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
  const [localBot, setLocalBot] = useState<ParsedBot>({
    type: 'examples' as const,
    examples: [],
    flowiseId: '',
  })

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

  const saveChanges = async () => {
    try {
      setIsSaving(true)
      console.log('Saving bot:', localBot);
      const result = await updateTemplateBot(templateId, localBot)
      console.log('Save result:', result);
      onChange(localBot)
      toast.success('Änderungen gespeichert')
    } catch (error: any) {
      console.error('Error saving bot:', error)
      if (error.message.includes('Nicht autorisiert')) {
        toast.error('Sitzung abgelaufen - Bitte laden Sie die Seite neu und melden Sie sich erneut an')
      } else {
        toast.error('Fehler beim Speichern der Änderungen: ' + error.message)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const validateExample = (example: Example): boolean => {
    return example.question.length > 0 && 
           example.answer.length > 0 && 
           example.context.length > 0
  }

  const handleTypeChange = (value: 'examples' | 'flowise' | 'smart-search') => {
    const updatedBot = {
      ...localBot,
      type: value
    };
    setLocalBot(updatedBot);
  }

  const addExample = () => {
    const examples = localBot.examples || []
    const newExample = {
      question: '',
      answer: '',
      context: '',
      type: 'info' as const,
      metadata: {}
    }
    const newExamples = [...examples, newExample]
    setLocalBot({
      ...localBot,
      examples: newExamples
    })
    setValidationStates([...validationStates, {
      question: false,
      answer: false,
      context: false
    }])
  }

  const updateExample = (index: number, field: keyof Example, value: string) => {
    const examples = localBot.examples || []
    const newExamples = [...examples]
    if (field === 'type') {
      newExamples[index] = {
        ...newExamples[index],
        type: value as ResponseType,
        metadata: {}
      }
    } else {
      newExamples[index] = {
        ...newExamples[index],
        [field]: value
      }
    }

    setValidationStates(prev => {
      const newState = [...prev]
      newState[index] = {
        ...newState[index],
        [field]: value.length > 0
      }
      return newState
    })

    setLocalBot({
      ...localBot,
      examples: newExamples
    })
  }

  const updateExampleMetadata = (index: number, field: keyof NonNullable<Example['metadata']>, value: string) => {
    const newExamples = localBot.examples || []
    newExamples[index] = {
      ...newExamples[index],
      metadata: {
        ...(newExamples[index].metadata || {}),
        [field]: value
      }
    }
    const updatedBot = {
      ...localBot,
      examples: newExamples
    };
    console.log('Updating metadata, new bot state:', updatedBot);
    setLocalBot(updatedBot);
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
        return [{ field: 'buttonText', label: 'Button Text', type: 'text' }]
      case 'product':
        return [
          { field: 'image', label: 'Produkt Bild', type: 'url' },
          { field: 'price', label: 'Preis', type: 'text' },
          { field: 'buttonText', label: 'Button Text', type: 'text' }
        ]
      case 'event':
        return [
          { field: 'image', label: 'Event Bild', type: 'url' },
          { field: 'date', label: 'Datum', type: 'datetime-local' },
          { field: 'buttonText', label: 'Button Text', type: 'text' }
        ]
      case 'location':
        return [{ field: 'address', label: 'Adresse', type: 'text' }]
      case 'video':
        return [{ field: 'videoUrl', label: 'Video URL', type: 'url' }]
      case 'link':
        return [
          { field: 'url', label: 'Link URL', type: 'url' },
          { field: 'buttonText', label: 'Button Text', type: 'text' }
        ]
      case 'contact':
        return [
          { field: 'buttonText', label: 'Button Text', type: 'text' },
          { field: 'url', label: 'Kontakt URL', type: 'url' }
        ]
      case 'download':
        return [
          { field: 'url', label: 'Download URL', type: 'url' },
          { field: 'buttonText', label: 'Button Text', type: 'text' }
        ]
      case 'faq':
      case 'info':
      default:
        return []
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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Bot Typ</Label>
        <Select
          value={localBot.type}
          onValueChange={handleTypeChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BOT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Wählen Sie zwischen vordefinierten Beispielen, einer Flowise-Integration oder einem Smart Search AI
        </p>
      </div>

      {localBot.type === 'flowise' && (
        <div className="space-y-2">
          <Label htmlFor="flowiseId">Flowise ID</Label>
          <Input
            id="flowiseId"
            value={localBot.flowiseId || ''}
            onChange={(e) => onChange({ ...localBot, flowiseId: e.target.value })}
            placeholder="Flowise Chatflow ID"
          />
          <p className="text-sm text-muted-foreground">
            Die ID Ihres Flowise Chatflows für die KI-Integration
          </p>
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

      {localBot.type === 'examples' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Bot-Antworten</h3>
            <p className="text-sm text-muted-foreground">
              Hier können Sie festlegen, wie der Bot auf bestimmte Fragen antworten soll
            </p>
          </div>

          <div className="space-y-6">
            {localBot.examples.map((example, index) => (
              <div key={index} className="bg-white p-6 border rounded-lg space-y-6">
                {/* Header mit Nummer und Aktionen */}
                <div 
                  className="flex justify-between items-center pb-4 border-b cursor-pointer"
                  onClick={() => {
                    const newValidationStates = [...validationStates];
                    newValidationStates[index] = {
                      ...newValidationStates[index],
                      isCollapsed: !newValidationStates[index]?.isCollapsed
                    };
                    setValidationStates(newValidationStates);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-lg">Antwort {index + 1}</h4>
                    <span className="text-sm text-muted-foreground">
                      {example.question.length > 0 ? `"${example.question.substring(0, 50)}${example.question.length > 50 ? '...' : ''}"` : 'Neue Antwort'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(example);
                      }}
                      title="Vorschau"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeExample(index);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Löschen
                    </Button>
                  </div>
                </div>

                {/* Content */}
                {!validationStates[index]?.isCollapsed && (
                  <div className="grid gap-6">
                    {/* Frage */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-base">Wenn der Benutzer fragt:</Label>
                        {validationStates[index]?.question === false && (
                          <span className="text-sm text-destructive flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            Pflichtfeld
                          </span>
                        )}
                      </div>
                      <Input
                        value={example.question}
                        onChange={(e) => updateExample(index, 'question', e.target.value)}
                        maxLength={500}
                        placeholder="z.B.: Was sind Ihre Öffnungszeiten?"
                        className={validationStates[index]?.question === false ? 'border-destructive' : ''}
                      />
                      <div className="flex justify-between">
                        <p className="text-sm text-muted-foreground">
                          Geben Sie hier die Frage ein, wie sie ein Benutzer stellen könnte
                        </p>
                        <span className="text-sm text-muted-foreground">
                          {example.question.length}/500
                        </span>
                      </div>
                    </div>

                    {/* Antwort */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-base">Dann antwortet der Bot:</Label>
                        {validationStates[index]?.answer === false && (
                          <span className="text-sm text-destructive flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            Pflichtfeld
                          </span>
                        )}
                      </div>
                      <Textarea
                        value={example.answer}
                        onChange={(e) => updateExample(index, 'answer', e.target.value)}
                        maxLength={2000}
                        rows={4}
                        placeholder="z.B.: Wir sind Montag bis Freitag von 9:00 bis 18:00 Uhr für Sie da."
                        className={validationStates[index]?.answer === false ? 'border-destructive' : ''}
                      />
                      <div className="flex justify-between">
                        <p className="text-sm text-muted-foreground">
                          Für Listen können Sie • oder - am Zeilenanfang verwenden
                        </p>
                        <span className="text-sm text-muted-foreground">
                          {example.answer.length}/2000
                        </span>
                      </div>
                    </div>

                    {/* Layout und Zusatzfelder */}
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-base">Layout</Label>
                        <Select
                          value={example.type}
                          onValueChange={(value) => updateExample(index, 'type', value)}
                        >
                          <SelectTrigger>
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
                        <p className="text-sm text-muted-foreground">
                          Wählen Sie, wie die Antwort dargestellt werden soll
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-base">Thema (optional)</Label>
                        <Input
                          value={example.context}
                          onChange={(e) => updateExample(index, 'context', e.target.value)}
                          maxLength={100}
                          placeholder="z.B.: Öffnungszeiten"
                        />
                        <div className="flex justify-between">
                          <p className="text-sm text-muted-foreground">
                            Hilft bei der Gruppierung ähnlicher Fragen
                          </p>
                          <span className="text-sm text-muted-foreground">
                            {example.context.length}/100
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Zusatzfelder basierend auf dem Layout */}
                    {getMetadataFields(example.type).length > 0 && (
                      <div className="space-y-4 pt-4 border-t">
                        <Label className="text-base">Zusätzliche Informationen</Label>
                        <div className="grid sm:grid-cols-2 gap-4">
                          {getMetadataFields(example.type).map(({ field, label, type }) => (
                            <div key={field} className="space-y-2">
                              <Label>{label}</Label>
                              <Input
                                type={type}
                                value={example.metadata?.[field] || ''}
                                onChange={(e) => updateExampleMetadata(index, field, e.target.value)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Buttons am unteren Rand */}
          <div className="fixed bottom-4 right-4 flex gap-2">
            <Button
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addExample();
              }}
              size="sm"
              type="button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Neue Antwort
            </Button>
            <Button
              onClick={saveChanges}
              size="sm"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Speichern
            </Button>
          </div>
        </div>
      )}

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