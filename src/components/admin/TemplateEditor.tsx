'use client'

import React, { useState, useEffect } from 'react'
import { Template, ParsedContent, ParsedBranding, ParsedBot, ParsedMeta } from '@/lib/types/template'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { BotEditor } from './template/BotEditor'
import { BrandingEditor } from './template/BrandingEditor'
import { ContentEditor } from './template/ContentEditor'
import { MetadataEditor } from './template/meta/MetadataEditor'
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
    description: ''
  },
  showcase: {
    image: '',
    altText: '',
    context: {
      title: '',
      description: ''
    },
    cta: {
      title: '',
      question: ''
    }
  },
  features: [
    {
      title: '',
      description: '',
      icon: ''
    }
  ],
  contact: {
    title: '',
    description: '',
    email: '',
    buttonText: ''
  },
  dialog: {
    title: '',
    description: ''
  }
}

const defaultBranding: ParsedBranding = {
  logo: '',
  primaryColor: '#4F46E5',
  secondaryColor: '#7C3AED',
  backgroundColor: '#FFFFFF',
  textColor: '#000000',
  font: 'Inter'
}

const defaultBot: ParsedBot = {
  type: 'examples',
  examples: [],
  flowiseId: ''
}

const defaultMeta: ParsedMeta = {
  title: '',
  description: '',
  domain: '',
  contactUrl: '/kontakt',
  servicesUrl: '/leistungen'
}

export default function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const defaultTemplate: Template = {
    id: '',
    name: '',
    type: 'NEUTRAL',
    active: true,
    subdomain: '',
    jsonContent: JSON.stringify(defaultContent),
    jsonBranding: JSON.stringify(defaultBranding),
    jsonBot: JSON.stringify(defaultBot),
    jsonMeta: JSON.stringify(defaultMeta),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const [currentTemplate, setCurrentTemplate] = useState<Template>(() => {
    if (!template) return defaultTemplate

    console.log('Template vor der Initialisierung:', template)
    
    const parseJson = (jsonString: string, defaultValue: any) => {
      try {
        if (typeof jsonString !== 'string') return jsonString
        if (jsonString.trim() === '') return defaultValue
        return jsonString.startsWith('"') 
          ? JSON.parse(JSON.parse(jsonString))
          : JSON.parse(jsonString)
      } catch (error) {
        console.error('JSON Parse Error:', error)
        return defaultValue
      }
    }
    
    const parsedTemplate = {
      ...template,
      jsonContent: parseJson(template.jsonContent, defaultContent),
      jsonBranding: parseJson(template.jsonBranding, defaultBranding),
      jsonBot: parseJson(template.jsonBot, defaultBot),
      jsonMeta: parseJson(template.jsonMeta, defaultMeta)
    }
    
    console.log('Geparste Template:', parsedTemplate)
    
    return parsedTemplate
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
      jsonContent: content
    })
    setHasChanges(true)
  }

  const handleBrandingChange = (branding: ParsedBranding) => {
    setCurrentTemplate({
      ...currentTemplate,
      jsonBranding: branding
    })
    setHasChanges(true)
  }

  const handleBotChange = async (bot: ParsedBot) => {
    setCurrentTemplate({
      ...currentTemplate,
      jsonBot: bot
    })
    setHasChanges(true)
  }

  const handleMetaChange = (meta: ParsedMeta) => {
    setCurrentTemplate({
      ...currentTemplate,
      jsonMeta: meta
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
                  onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="subdomain">Subdomain</Label>
                <Input
                  id="subdomain"
                  value={currentTemplate.subdomain || ''}
                  onChange={(e) => setCurrentTemplate({ ...currentTemplate, subdomain: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="type">Template Typ</Label>
                <Select
                  value={currentTemplate.type}
                  onValueChange={(value) => setCurrentTemplate({ ...currentTemplate, type: value as Template['type'] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wählen Sie einen Typ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEUTRAL">Neutral</SelectItem>
                    <SelectItem value="INDUSTRY">Branche</SelectItem>
                    <SelectItem value="CUSTOM">Individuell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                <Label htmlFor="active">Status</Label>
                <Switch
                  id="active"
                  checked={currentTemplate.active}
                  onCheckedChange={(checked) => setCurrentTemplate({ ...currentTemplate, active: checked })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border">
        <Tabs defaultValue="content" className="w-full">
          <div className="border-b px-6 py-4">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="content">Inhalte</TabsTrigger>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="bot">Bot</TabsTrigger>
              <TabsTrigger value="meta">Meta</TabsTrigger>
              <TabsTrigger value="content-types">Inhaltstypen</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="content">
              <ContentEditor
                content={currentTemplate.jsonContent as ParsedContent}
                onChange={handleContentChange}
              />
            </TabsContent>

            <TabsContent value="branding">
              <BrandingEditor
                branding={currentTemplate.jsonBranding as ParsedBranding}
                onChange={handleBrandingChange}
              />
            </TabsContent>

            <TabsContent value="bot">
              <BotEditor
                bot={currentTemplate.jsonBot as ParsedBot}
                onChange={handleBotChange}
                templateId={currentTemplate.id}
              />
            </TabsContent>

            <TabsContent value="meta">
              <MetadataEditor
                meta={currentTemplate.jsonMeta as ParsedMeta}
                onChange={handleMetaChange}
              />
            </TabsContent>

            <TabsContent value="content-types">
              <div className="space-y-4">
                {currentTemplate.id ? (
                  <ContentTypeManager templateId={currentTemplate.id} />
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    Bitte speichern Sie das Template zuerst, um Inhaltstypen zu verwalten.
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
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