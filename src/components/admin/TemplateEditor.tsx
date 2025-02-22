'use client'

import React, { useState, useEffect } from 'react'
import { Template, ParsedContent, ParsedBranding, ParsedBot } from '@/lib/types/template'
import { DialogEngineConfig, FlowiseBotConfig, ExamplesBotConfig } from '@/lib/types/bot'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { BotEditor } from './template/BotEditor'
import { BrandingEditor } from './template/BrandingEditor'
import { ContentEditor } from './template/ContentEditor'
import { AnalyticsEditor } from './template/AnalyticsEditor'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import ContentTypeManager from './ContentTypeManager'

type TemplateEditorProps = {
  template?: Template
  onSave: (template: Template) => Promise<void>
  onCancel: () => void
}

const defaultContent: ParsedContent = {
  hero: {
    title: '',
    subtitle: '',
    description: '',
    image: ''
  },
  features: [],
  examples: [],
  showcase: {
    title: '',
    image: '',
    altText: '',
    context: {
      title: '',
      description: ''
    },
    cta: {
      title: '',
      hint: '',
      question: ''
    },
    items: []
  },
  contact: {
    title: '',
    email: '',
    phone: '',
    address: '',
    description: '',
    buttonText: ''
  },
  dialog: {
    title: '',
    description: '',
    examples: []
  }
}

const defaultBranding: ParsedBranding = {
  logo: '',
  colors: {
    primary: '#4F46E5',
    secondary: '#7C3AED'
  },
  fonts: {
    primary: 'Inter'
  }
}

const defaultBot: ParsedBot = {
  type: 'examples',
  config: {
    type: 'examples',
    active: true,
    examples: [],
    config: {
      matchThreshold: 0.7,
      fuzzySearch: true,
      includeMetadata: true
    }
  },
  active: true,
  examples: []
}

const defaultTemplate: Template = {
  id: '',
  name: '',
  type: 'NEUTRAL',
  active: true,
  subdomain: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  flowiseConfigId: null,
  branding: defaultBranding,
  bot_config: defaultBot,
  handlers: [],
  meta: {
    title: '',
    description: '',
    keywords: [],
    author: '',
    image: '',
    url: ''
  },
  content: {
    metadata: {},
    sections: []
  },
  description: null
}

export default function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const [currentTemplate, setCurrentTemplate] = useState<Template>(() => {
    if (!template) return defaultTemplate

    console.log('Template vor der Initialisierung:', template)
    
    return template
  })

  useEffect(() => {
    console.log('Aktuelles Template:', currentTemplate)
  }, [currentTemplate])

  const [hasChanges, setHasChanges] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!hasChanges) return
    
    try {
      setIsSubmitting(true)
      console.log('Template vor dem Speichern:', currentTemplate)
      await onSave(currentTemplate)
      setHasChanges(false)
      toast.success('Template erfolgreich gespeichert')
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      toast.error('Fehler beim Speichern des Templates')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleContentChange = (content: ParsedContent) => {
    setCurrentTemplate({
      ...currentTemplate,
      content: {
        ...currentTemplate.content,
        sections: [
          {
            id: 'main',
            type: 'main',
            title: content.hero.title,
            subtitle: content.hero.subtitle,
            content: content.hero.description,
            image: content.hero.image
          },
          ...content.features.map((feature, index) => ({
            id: `feature-${index}`,
            type: 'feature',
            title: feature.title,
            content: feature.description,
            image: feature.icon
          }))
        ]
      }
    })
    setHasChanges(true)
  }

  const handleBrandingChange = (branding: ParsedBranding) => {
    setCurrentTemplate({
      ...currentTemplate,
      branding
    })
    setHasChanges(true)
  }

  const handleBotChange = async (bot: ParsedBot) => {
    setCurrentTemplate({
      ...currentTemplate,
      bot_config: bot
    })
    setHasChanges(true)
  }

  return (
    <div className="space-y-8 p-8">
      {/* Basic Info */}
      <div className="space-y-6 bg-white rounded-lg border p-6">
        <div>
          <h2 className="text-lg font-medium mb-4">Grundeinstellungen</h2>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={currentTemplate.name}
                  onChange={(e) => {
                    setCurrentTemplate({ ...currentTemplate, name: e.target.value })
                    setHasChanges(true)
                  }}
                  required
                />
              </div>
              <div>
                <Label htmlFor="subdomain">Subdomain</Label>
                <Input
                  id="subdomain"
                  value={currentTemplate.subdomain || ''}
                  onChange={(e) => {
                    setCurrentTemplate({ ...currentTemplate, subdomain: e.target.value || null })
                    setHasChanges(true)
                  }}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="type">Template Typ</Label>
                <Select
                  value={currentTemplate.type}
                  onValueChange={(value) => {
                    setCurrentTemplate({ ...currentTemplate, type: value })
                    setHasChanges(true)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wählen Sie einen Typ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEUTRAL">Neutral</SelectItem>
                    <SelectItem value="CUSTOM">Individuell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                <Label htmlFor="active">Status</Label>
                <Switch
                  id="active"
                  checked={currentTemplate.active}
                  onCheckedChange={(checked) => {
                    setCurrentTemplate({ ...currentTemplate, active: checked })
                    setHasChanges(true)
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border">
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-4 gap-4 p-4">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="bot">Bot</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="p-6">
            <ContentEditor 
              content={{
                hero: {
                  title: currentTemplate.content.sections.find(s => s.type === 'main')?.title || '',
                  subtitle: currentTemplate.content.sections.find(s => s.type === 'main')?.subtitle || '',
                  description: currentTemplate.content.sections.find(s => s.type === 'main')?.content || '',
                  image: currentTemplate.content.sections.find(s => s.type === 'main')?.image || ''
                },
                features: currentTemplate.content.sections
                  .filter(s => s.type === 'feature')
                  .map(f => ({
                    title: f.title,
                    description: f.content,
                    icon: f.image || ''
                  })),
                examples: [],
                contact: {
                  title: '',
                  email: '',
                  phone: '',
                  address: '',
                  description: '',
                  buttonText: ''
                },
                dialog: {
                  title: '',
                  description: '',
                  examples: []
                }
              }}
              onChange={handleContentChange} 
            />
          </TabsContent>

          <TabsContent value="branding" className="p-6">
            <BrandingEditor 
              branding={typeof currentTemplate.branding === 'string' 
                ? JSON.parse(currentTemplate.branding) 
                : currentTemplate.branding
              } 
              onChange={handleBrandingChange} 
            />
          </TabsContent>

          <TabsContent value="bot" className="p-6">
            <BotEditor 
              type={currentTemplate.bot_config.type}
              config={currentTemplate.bot_config.type === 'examples' 
                ? currentTemplate.bot_config.config as ExamplesBotConfig
                : currentTemplate.bot_config.type === 'flowise'
                ? currentTemplate.bot_config.config as FlowiseBotConfig
                : currentTemplate.bot_config.config as DialogEngineConfig
              }
              templateId={currentTemplate.id}
              onTypeChange={(type) => handleBotChange({
                ...currentTemplate.bot_config,
                type
              })}
              onConfigChange={(config) => handleBotChange({
                ...currentTemplate.bot_config,
                config
              })}
            />
          </TabsContent>

          <TabsContent value="analytics" className="p-6">
            <AnalyticsEditor templateId={currentTemplate.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4 bg-gray-50 px-6 py-4 rounded-lg">
        <Button type="button" variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || !hasChanges}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Speichern...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {hasChanges ? "Änderungen speichern" : "Keine Änderungen"}
            </>
          )}
        </Button>
      </div>
    </div>
  )
} 