'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Save, X } from "lucide-react"
import type { ResponseContentType } from '@/lib/types/contentTypes'

interface LayoutConfig {
  id: string
  name: string
  description?: string
  config: {
    type: ResponseContentType
    template: string
    conditions: {
      requiredSchemas: string[]
      requiredHandlers: string[]
      contextRules: Array<{
        field: string
        operator: 'equals' | 'contains' | 'startsWith' | 'endsWith'
        value: string
      }>
    }
  }
  metadata: {
    icon?: string
    previewImage?: string
    lastModified: string
    version: number
  }
}

interface LayoutEditorProps {
  layout: LayoutConfig
  onSave: (layout: LayoutConfig) => void
  onCancel: () => void
  onDelete: () => void
}

const RESPONSE_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'list', label: 'Liste' },
  { value: 'table', label: 'Tabelle' },
  { value: 'card', label: 'Karte' },
  { value: 'link', label: 'Link' },
  { value: 'download', label: 'Download' },
  { value: 'image', label: 'Bild' },
  { value: 'video', label: 'Video' },
  { value: 'custom', label: 'Benutzerdefiniert' }
] as const

export function LayoutEditor({ layout: initialLayout, onSave, onCancel, onDelete }: LayoutEditorProps) {
  const [layout, setLayout] = useState<LayoutConfig>(initialLayout)
  const [activeTab, setActiveTab] = useState('basic')

  const handleSave = () => {
    const updatedLayout = {
      ...layout,
      metadata: {
        ...layout.metadata,
        lastModified: new Date().toISOString(),
        version: layout.metadata.version + 1
      }
    }
    onSave(updatedLayout)
  }

  const addConditionRule = () => {
    setLayout(prev => ({
      ...prev,
      config: {
        ...prev.config,
        conditions: {
          ...prev.config.conditions,
          contextRules: [
            ...prev.config.conditions.contextRules,
            { field: '', operator: 'equals', value: '' }
          ]
        }
      }
    }))
  }

  const removeConditionRule = (index: number) => {
    setLayout(prev => ({
      ...prev,
      config: {
        ...prev.config,
        conditions: {
          ...prev.config.conditions,
          contextRules: prev.config.conditions.contextRules.filter((_, i) => i !== index)
        }
      }
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Layout bearbeiten</h3>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Abbrechen
          </Button>
          <Button variant="default" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Speichern
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="basic">Grundeinstellungen</TabsTrigger>
          <TabsTrigger value="template">Template</TabsTrigger>
          <TabsTrigger value="conditions">Bedingungen</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={layout.name}
                onChange={(e) => setLayout(prev => ({ ...prev, name: e.target.value }))}
                placeholder="z.B. Produktkarte, FAQ-Liste"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={layout.description || ''}
                onChange={(e) => setLayout(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Beschreiben Sie den Zweck und die Verwendung dieses Layouts..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Antworttyp</Label>
              <Select
                value={layout.config.type}
                onValueChange={(value) => setLayout(prev => ({
                  ...prev,
                  config: {
                    ...prev.config,
                    type: value as ResponseContentType
                  }
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Typ auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {RESPONSE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="template" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="template">Template-Code</Label>
            <Textarea
              id="template"
              value={layout.config.template}
              onChange={(e) => setLayout(prev => ({
                ...prev,
                config: {
                  ...prev.config,
                  template: e.target.value
                }
              }))}
              className="font-mono"
              rows={10}
              placeholder="HTML/JSX Template für dieses Layout..."
            />
            <p className="text-sm text-muted-foreground">
              Verwenden Sie Platzhalter wie {'{title}'}, {'{content}'} etc. für dynamische Inhalte.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="conditions" className="space-y-4 mt-4">
          <Card className="p-4">
            <h4 className="font-medium mb-2">Erforderliche Schemas</h4>
            <div className="flex flex-wrap gap-2 mb-4">
              {layout.config.conditions.requiredSchemas.map((schema, index) => (
                <Badge key={index} variant="secondary" className="cursor-pointer">
                  {schema}
                  <X
                    className="h-3 w-3 ml-1"
                    onClick={() => setLayout(prev => ({
                      ...prev,
                      config: {
                        ...prev.config,
                        conditions: {
                          ...prev.config.conditions,
                          requiredSchemas: prev.config.conditions.requiredSchemas.filter((_, i) => i !== index)
                        }
                      }
                    }))}
                  />
                </Badge>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLayout(prev => ({
                  ...prev,
                  config: {
                    ...prev.config,
                    conditions: {
                      ...prev.config.conditions,
                      requiredSchemas: [...prev.config.conditions.requiredSchemas, '']
                    }
                  }
                }))}
              >
                <Plus className="h-4 w-4 mr-1" />
                Schema hinzufügen
              </Button>
            </div>

            <h4 className="font-medium mb-2">Erforderliche Handler</h4>
            <div className="flex flex-wrap gap-2 mb-4">
              {layout.config.conditions.requiredHandlers.map((handler, index) => (
                <Badge key={index} variant="secondary" className="cursor-pointer">
                  {handler}
                  <X
                    className="h-3 w-3 ml-1"
                    onClick={() => setLayout(prev => ({
                      ...prev,
                      config: {
                        ...prev.config,
                        conditions: {
                          ...prev.config.conditions,
                          requiredHandlers: prev.config.conditions.requiredHandlers.filter((_, i) => i !== index)
                        }
                      }
                    }))}
                  />
                </Badge>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLayout(prev => ({
                  ...prev,
                  config: {
                    ...prev.config,
                    conditions: {
                      ...prev.config.conditions,
                      requiredHandlers: [...prev.config.conditions.requiredHandlers, '']
                    }
                  }
                }))}
              >
                <Plus className="h-4 w-4 mr-1" />
                Handler hinzufügen
              </Button>
            </div>

            <h4 className="font-medium mb-2">Kontext-Regeln</h4>
            <div className="space-y-4">
              {layout.config.conditions.contextRules.map((rule, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={rule.field}
                    onChange={(e) => {
                      const newRules = [...layout.config.conditions.contextRules]
                      newRules[index] = { ...rule, field: e.target.value }
                      setLayout(prev => ({
                        ...prev,
                        config: {
                          ...prev.config,
                          conditions: {
                            ...prev.config.conditions,
                            contextRules: newRules
                          }
                        }
                      }))
                    }}
                    placeholder="Feldname"
                    className="flex-1"
                  />
                  <Select
                    value={rule.operator}
                    onValueChange={(value) => {
                      const newRules = [...layout.config.conditions.contextRules]
                      newRules[index] = { ...rule, operator: value as any }
                      setLayout(prev => ({
                        ...prev,
                        config: {
                          ...prev.config,
                          conditions: {
                            ...prev.config.conditions,
                            contextRules: newRules
                          }
                        }
                      }))
                    }}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Gleich</SelectItem>
                      <SelectItem value="contains">Enthält</SelectItem>
                      <SelectItem value="startsWith">Beginnt mit</SelectItem>
                      <SelectItem value="endsWith">Endet mit</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={rule.value}
                    onChange={(e) => {
                      const newRules = [...layout.config.conditions.contextRules]
                      newRules[index] = { ...rule, value: e.target.value }
                      setLayout(prev => ({
                        ...prev,
                        config: {
                          ...prev.config,
                          conditions: {
                            ...prev.config.conditions,
                            contextRules: newRules
                          }
                        }
                      }))
                    }}
                    placeholder="Wert"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeConditionRule(index)}
                    className="text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={addConditionRule}>
                <Plus className="h-4 w-4 mr-2" />
                Regel hinzufügen
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 