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
import { MetadataEditor } from './template/MetadataEditor'
import { AnalyticsEditor } from './template/AnalyticsEditor'
import { toast } from 'sonner'

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
  secondaryColor: '#7C3AED'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      console.log('Template vor dem Speichern:', currentTemplate)
      await onSave(currentTemplate)
      toast.success('Template erfolgreich gespeichert')
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      toast.error('Fehler beim Speichern des Templates')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 p-8">
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
            <TabsList>
              <TabsTrigger value="content">Inhalt</TabsTrigger>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="bot">Bot</TabsTrigger>
              <TabsTrigger value="meta">Meta</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="content">
              <ContentEditor
                content={currentTemplate.jsonContent as ParsedContent}
                onChange={(content) => {
                  setCurrentTemplate({
                    ...currentTemplate,
                    jsonContent: content
                  });
                  toast.success('Inhalt gespeichert');
                }}
              />
            </TabsContent>

            <TabsContent value="branding">
              <BrandingEditor
                branding={currentTemplate.jsonBranding as ParsedBranding}
                onChange={(branding) => setCurrentTemplate({
                  ...currentTemplate,
                  jsonBranding: branding
                })}
              />
            </TabsContent>

            <TabsContent value="bot">
              <BotEditor
                bot={currentTemplate.jsonBot as ParsedBot}
                templateId={currentTemplate.id || ''}
                onChange={(bot) => setCurrentTemplate({
                  ...currentTemplate,
                  jsonBot: bot
                })}
              />
            </TabsContent>

            <TabsContent value="meta">
              <MetadataEditor
                metadata={currentTemplate.jsonMeta as ParsedMeta}
                onChange={(meta) => setCurrentTemplate({
                  ...currentTemplate,
                  jsonMeta: meta
                })}
              />
            </TabsContent>

            <TabsContent value="analytics">
              <AnalyticsEditor templateId={currentTemplate.id} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4 bg-gray-50 px-6 py-4 rounded-lg">
        <Button type="button" variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button type="submit">
          Speichern
        </Button>
      </div>
    </form>
  )
} 