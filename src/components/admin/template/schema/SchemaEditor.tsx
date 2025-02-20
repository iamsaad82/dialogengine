'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus, Save } from "lucide-react"
import type { DocumentPattern, MetadataDefinition } from '@/lib/types/template'
import type { ExtractionSchemaFields, SchemaDefinition } from '@/lib/types/schema'
import { PatternEditor } from './PatternEditor'
import { MetadataEditor } from './MetadataEditor'
import { ResponseTypeEditor } from './ResponseTypeEditor'

interface SchemaEditorProps {
  templateId: string
  schema: ExtractionSchemaFields
  onChange: (schema: ExtractionSchemaFields) => void
}

export function SchemaEditor({ templateId, schema: initialSchema, onChange }: SchemaEditorProps) {
  const [activeTab, setActiveTab] = useState('patterns')
  const [schema, setSchema] = useState<ExtractionSchemaFields>(initialSchema)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setSchema(initialSchema)
  }, [initialSchema])

  const handleSave = async () => {
    if (!schema) return

    try {
      setSaving(true)
      onChange(schema)
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      toast({
        title: 'Fehler',
        description: 'Das Schema konnte nicht gespeichert werden.'
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePatternsChange = (patterns: DocumentPattern[]) => {
    const updatedSchema = {
      ...schema,
      patterns
    }
    setSchema(updatedSchema)
    onChange(updatedSchema)
  }

  const handleMetadataChange = (metadata: MetadataDefinition[]) => {
    const updatedSchema = {
      ...schema,
      metadata
    }
    setSchema(updatedSchema)
    onChange(updatedSchema)
  }

  const handleResponseTypesChange = (responseTypes: ExtractionSchemaFields['responseTypes']) => {
    const updatedSchema = {
      ...schema,
      responseTypes
    }
    setSchema(updatedSchema)
    onChange(updatedSchema)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!schema) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Kein Schema gefunden</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <Label>Name des Schemas</Label>
          <Input
            value={schema.name || ''}
            onChange={(e) => setSchema({ ...schema, name: e.target.value })}
            className="max-w-md"
            placeholder="z.B. Versicherungsanträge, Rechnungen, etc."
          />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Wird gespeichert...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Speichern
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="patterns" className="flex items-center gap-2">
            <span>1.</span> Dokumenterkennung
          </TabsTrigger>
          <TabsTrigger value="metadata" className="flex items-center gap-2">
            <span>2.</span> Informationsextraktion
          </TabsTrigger>
          <TabsTrigger value="responses" className="flex items-center gap-2">
            <span>3.</span> Antwortformate
          </TabsTrigger>
        </TabsList>

        <div className="mt-2 text-sm text-muted-foreground">
          {activeTab === 'patterns' && (
            "Definieren Sie, welche Arten von Dokumenten erkannt werden sollen."
          )}
          {activeTab === 'metadata' && (
            "Legen Sie fest, welche Informationen aus den Dokumenten extrahiert werden sollen."
          )}
          {activeTab === 'responses' && (
            "Bestimmen Sie, wie die extrahierten Informationen dargestellt werden sollen."
          )}
        </div>

        <TabsContent value="patterns" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Dokumenterkennung</CardTitle>
              <CardDescription>
                Definieren Sie Muster zur Erkennung von Dokumenttypen und deren Inhalten.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PatternEditor
                patterns={schema.patterns}
                onChange={handlePatternsChange}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Informationsextraktion</CardTitle>
              <CardDescription>
                Legen Sie fest, welche Informationen aus den erkannten Dokumenten extrahiert werden sollen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MetadataEditor
                metadata={schema.metadata}
                onChange={handleMetadataChange}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Antwortformate</CardTitle>
              <CardDescription>
                Definieren Sie die Struktur der verschiedenen Antworttypen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponseTypeEditor
                responseTypes={schema.responseTypes}
                onChange={handleResponseTypesChange}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h3 className="font-medium mb-2">Hilfe & Tipps</h3>
        <div className="text-sm text-muted-foreground space-y-2">
          {activeTab === 'patterns' && (
            <>
              <p>• Geben Sie aussagekräftige Namen für Ihre Dokumentmuster</p>
              <p>• Fügen Sie Beispiele hinzu, um die Erkennung zu verbessern</p>
              <p>• Markieren Sie wichtige Muster als "Erforderlich"</p>
            </>
          )}
          {activeTab === 'metadata' && (
            <>
              <p>• Wählen Sie passende Feldtypen für die zu extrahierenden Informationen</p>
              <p>• Nutzen Sie die Beschreibungen, um die Extraktion zu präzisieren</p>
              <p>• Geben Sie Beispielwerte an, um die Qualität zu verbessern</p>
            </>
          )}
          {activeTab === 'responses' && (
            <>
              <p>• Wählen Sie geeignete Antwortformate für Ihre Inhalte</p>
              <p>• Nutzen Sie Vorlagen mit Variablen wie {'{feldname}'}</p>
              <p>• Prüfen Sie die Vorschau für optimale Darstellung</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 