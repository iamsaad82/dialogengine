'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus, Trash2, GripVertical, InfoIcon, FileText, ListChecks, Save, Building2, ShoppingBag, Calendar, MapPin, Phone, FileQuestion, Download, Info, Video } from 'lucide-react'
import type { SchemaField, ExtractionSchema as BaseExtractionSchema } from '@/lib/schemas/template'
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided } from '@hello-pangea/dnd'
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from 'next/navigation'
import { Badge } from "@/components/ui/badge"

const FIELD_TYPES = [
  { value: 'string', label: 'Text', description: 'Für Überschriften, Namen oder kurze Texte' },
  { value: 'number', label: 'Zahl', description: 'Für Preise, Mengen oder andere numerische Werte' },
  { value: 'boolean', label: 'Ja/Nein', description: 'Für einfache Ja/Nein-Entscheidungen' },
  { value: 'date', label: 'Datum', description: 'Für Termine und Zeitangaben' },
  { value: 'array', label: 'Liste', description: 'Für mehrere Einträge des gleichen Typs' },
  { value: 'object', label: 'Gruppe', description: 'Für zusammengehörige Informationen' }
]

interface ExampleSchemaField extends Omit<SchemaField, 'properties'> {
  properties?: ExampleSchemaField[];
}

interface ExampleSchema {
  name: string;
  description: string;
  icon: any;
  fields: ExampleSchemaField[];
}

interface DefaultSchema {
  name: string
  description: string
  icon: any
  isDefault: boolean
  fields: SchemaField[]
}

interface Handler {
  type: string
  active: boolean
  metadata: {
    keyTopics: string[]
    [key: string]: any
  }
  responses: Array<{
    type: string
    content: string
  }>
  settings: {
    matchThreshold: number
    contextWindow: number
    [key: string]: any
  }
}

interface ExtractionSchema extends BaseExtractionSchema {
  handlers: Handler[]
}

const DEFAULT_SCHEMAS: DefaultSchema[] = [
  {
    name: "Dienstleistungen & Services",
    description: "Ideal für die Extraktion von Service-Angeboten, Leistungen und Beratungsangeboten.",
    icon: Building2,
    isDefault: true,
    fields: [
      {
        name: "titel",
        type: "string",
        description: "Der Name des Services oder der Dienstleistung",
        required: true,
        isArray: false
      },
      {
        name: "beschreibung",
        type: "string",
        description: "Detaillierte Beschreibung des Angebots",
        required: true,
        isArray: false
      },
      {
        name: "voraussetzungen",
        type: "string",
        description: "Bedingungen oder Voraussetzungen für die Inanspruchnahme",
        required: false,
        isArray: false
      },
      {
        name: "zielgruppe",
        type: "string",
        description: "Für wen ist dieser Service gedacht?",
        required: false,
        isArray: false
      },
      {
        name: "kosten",
        type: "string",
        description: "Preise oder Kostenhinweise",
        required: false,
        isArray: false
      }
    ]
  },
  {
    name: "FAQ & Hilfe",
    description: "Für häufig gestellte Fragen und deren Antworten.",
    icon: FileQuestion,
    isDefault: true,
    fields: [
      {
        name: "frage",
        type: "string",
        description: "Die gestellte Frage",
        required: true,
        isArray: false
      },
      {
        name: "antwort",
        type: "string",
        description: "Die ausführliche Antwort",
        required: true,
        isArray: false
      },
      {
        name: "kategorie",
        type: "string",
        description: "Themenbereich der Frage",
        required: false,
        isArray: false
      }
    ]
  },
  {
    name: "Standorte & Filialen",
    description: "Für Kontaktdaten und Informationen zu Geschäftsstellen.",
    icon: MapPin,
    isDefault: true,
    fields: [
      {
        name: "name",
        type: "string",
        description: "Name des Standorts",
        required: true,
        isArray: false
      },
      {
        name: "adresse",
        type: "object",
        description: "Vollständige Adressdaten",
        required: true,
        isArray: false,
        properties: [
          {
            name: "strasse",
            type: "string",
            description: "Straße und Hausnummer",
            required: true,
            isArray: false
          },
          {
            name: "plz",
            type: "string",
            description: "Postleitzahl",
            required: true,
            isArray: false
          },
          {
            name: "ort",
            type: "string",
            description: "Stadt/Ort",
            required: true,
            isArray: false
          }
        ]
      },
      {
        name: "oeffnungszeiten",
        type: "string",
        description: "Reguläre Öffnungszeiten",
        required: true,
        isArray: false
      },
      {
        name: "telefon",
        type: "string",
        description: "Telefonnummer für Kontakt",
        required: true,
        isArray: false
      },
      {
        name: "email",
        type: "string",
        description: "E-Mail-Adresse",
        required: false,
        isArray: false
      }
    ]
  },
  {
    name: "Downloads & Dokumente",
    description: "Ideal für PDF-Dokumente, Formulare und andere herunterladbare Ressourcen.",
    icon: Download,
    isDefault: true,
    fields: [
      {
        name: "titel",
        type: "string",
        description: "Der Name des Dokuments",
        required: true,
        isArray: false
      },
      {
        name: "beschreibung",
        type: "string",
        description: "Kurze Beschreibung des Dokumentinhalts",
        required: true,
        isArray: false
      },
      {
        name: "dateityp",
        type: "string",
        description: "Art des Dokuments (z.B. PDF, DOCX)",
        required: true,
        isArray: false
      },
      {
        name: "dateigroesse",
        type: "string",
        description: "Größe der Datei",
        required: false,
        isArray: false
      },
      {
        name: "downloadUrl",
        type: "string",
        description: "Link zum Download des Dokuments",
        required: true,
        isArray: false
      },
      {
        name: "version",
        type: "string",
        description: "Version oder Stand des Dokuments",
        required: false,
        isArray: false
      }
    ]
  },
  {
    name: "Videos & Multimedia",
    description: "Für Video-Content, Tutorials und multimediale Inhalte.",
    icon: Video,
    isDefault: true,
    fields: [
      {
        name: "titel",
        type: "string",
        description: "Titel des Videos",
        required: true,
        isArray: false
      },
      {
        name: "beschreibung",
        type: "string",
        description: "Beschreibung des Videoinhalts",
        required: true,
        isArray: false
      },
      {
        name: "videoUrl",
        type: "string",
        description: "URL zum Video (YouTube, Vimeo etc.)",
        required: true,
        isArray: false
      },
      {
        name: "dauer",
        type: "string",
        description: "Länge des Videos",
        required: false,
        isArray: false
      },
      {
        name: "thumbnail",
        type: "string",
        description: "Vorschaubild des Videos",
        required: false,
        isArray: false
      },
      {
        name: "untertitel",
        type: "string",
        description: "URL zu Untertiteln/Transkript",
        required: false,
        isArray: false
      }
    ]
  }
]

interface SchemaEditorProps {
  templateId: string
}

export function SchemaEditor({ templateId }: SchemaEditorProps) {
  const [schema, setSchema] = useState<ExtractionSchema | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    loadSchema()
  }, [templateId])

  const loadSchema = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/templates/${templateId}/schema`)
      
      if (response.status === 404) {
        // Erstelle ein neues Schema wenn keines existiert
        const defaultFields = DEFAULT_SCHEMAS.flatMap(schema => schema.fields)
        setSchema({
          id: '',
          templateId,
          name: 'Standard Schema',
          description: 'Automatisch aktivierte Standard-Vorlagen',
          version: 1,
          fields: defaultFields,
          handlers: [],
          createdAt: new Date(),
          updatedAt: new Date()
        })
        return
      }
      
      if (!response.ok) throw new Error('Fehler beim Laden')
      
      const data = await response.json()
      setSchema({
        ...data.schema,
        handlers: data.schema.handlers || []
      })
    } catch (error) {
      console.error('Fehler beim Laden des Schemas:', error)
      toast({
        title: 'Fehler',
        description: 'Das Schema konnte nicht geladen werden.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!schema) return

    try {
      setSaving(true)
      const response = await fetch(`/api/templates/${templateId}/schema`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schema }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fehler beim Speichern')
      }
      
      toast({
        title: 'Erfolg',
        description: 'Die Änderungen wurden gespeichert.'
      })
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Die Änderungen konnten nicht gespeichert werden.'
      })
    } finally {
      setSaving(false)
    }
  }

  const addField = (parentPath: string[] = []) => {
    if (!schema) return

    const newField: SchemaField = {
      name: '',
      type: 'string',
      description: '',
      required: false,
      isArray: false
    }

    setSchema(prev => {
      if (!prev) return prev

      const updateFields = (fields: SchemaField[], path: string[]): SchemaField[] => {
        if (path.length === 0) {
          return [...fields, newField]
        }

        const [current, ...rest] = path
        const index = parseInt(current)
        return fields.map((field, i) => {
          if (i !== index) return field
          return {
            ...field,
            properties: field.properties 
              ? updateFields(field.properties, rest)
              : [newField]
          }
        })
      }

      return {
        ...prev,
        fields: updateFields(prev.fields, parentPath)
      }
    })
  }

  const removeField = (path: string[]) => {
    if (!schema) return

    setSchema(prev => {
      if (!prev) return prev

      const updateFields = (fields: SchemaField[], path: string[]): SchemaField[] => {
        if (path.length === 1) {
          const index = parseInt(path[0])
          return fields.filter((_, i) => i !== index)
        }

        const [current, ...rest] = path
        const index = parseInt(current)
        return fields.map((field, i) => {
          if (i !== index) return field
          return {
            ...field,
            properties: field.properties 
              ? updateFields(field.properties, rest)
              : []
          }
        })
      }

      return {
        ...prev,
        fields: updateFields(prev.fields, path)
      }
    })
  }

  const updateField = (path: string[], updates: Partial<SchemaField>) => {
    if (!schema) return

    setSchema(prev => {
      if (!prev) return prev

      const updateFields = (fields: SchemaField[], path: string[]): SchemaField[] => {
        if (path.length === 1) {
          const index = parseInt(path[0])
          return fields.map((field, i) => 
            i === index ? { ...field, ...updates } : field
          )
        }

        const [current, ...rest] = path
        const index = parseInt(current)
        return fields.map((field, i) => {
          if (i !== index) return field
          return {
            ...field,
            properties: field.properties 
              ? updateFields(field.properties, rest)
              : []
          }
        })
      }

      return {
        ...prev,
        fields: updateFields(prev.fields, path)
      }
    })
  }

  const updateHandler = async (handler: Handler) => {
    if (!schema) return

    setSchema(prev => {
      if (!prev) return prev

      const handlers = [...(prev.handlers || [])]
      const index = handlers.findIndex(h => h.type === handler.type)
      
      if (index >= 0) {
        handlers[index] = handler
      } else {
        handlers.push(handler)
      }

      return {
        ...prev,
        handlers
      }
    })

    setHasChanges(true)
  }

  const removeHandler = (type: string) => {
    if (!schema) return

    setSchema(prev => {
      if (!prev) return prev

      return {
        ...prev,
        handlers: (prev.handlers || []).filter(h => h.type !== type)
      }
    })

    setHasChanges(true)
  }

  const toggleHandler = (type: string) => {
    if (!schema) return

    setSchema(prev => {
      if (!prev) return prev

      return {
        ...prev,
        handlers: (prev.handlers || []).map(h => 
          h.type === type ? { ...h, active: !h.active } : h
        )
      }
    })

    setHasChanges(true)
  }

  const renderField = (field: SchemaField, path: string[], depth = 0) => {
    const fieldType = FIELD_TYPES.find(t => t.value === field.type)

    return (
      <Card key={path.join('.')} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
                <Input
                  value={field.name}
                  onChange={(e) => updateField(path, { name: e.target.value })}
                  placeholder="Feldname (z.B. Titel, Preis, Datum)"
                  className="max-w-[300px]"
                />
                <Select
                  value={field.type}
                  onValueChange={(value) => updateField(path, { 
                    type: value as SchemaField['type'],
                    properties: value === 'object' ? [] : undefined
                  })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center">
                          <span>{type.label}</span>
                          <HoverCard>
                            <HoverCardTrigger>
                              <InfoIcon className="h-4 w-4 ml-2" />
                            </HoverCardTrigger>
                            <HoverCardContent>
                              {type.description}
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Textarea
                value={field.description}
                onChange={(e) => updateField(path, { description: e.target.value })}
                placeholder="Beschreibung des Feldes (optional)"
                className="mt-2"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeField(path)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {(field.type === 'object' || field.type === 'array') && (
          <CardContent>
            <div className="pl-6 border-l-2 border-muted">
              <Alert className="mb-4">
                <AlertTitle>
                  {field.type === 'object' ? 'Gruppe von Feldern' : 'Liste von Einträgen'}
                </AlertTitle>
                <AlertDescription>
                  {field.type === 'object' 
                    ? 'Fügen Sie hier Felder hinzu, die zusammen eine logische Einheit bilden.'
                    : 'Fügen Sie hier die Struktur für jeden Eintrag in der Liste hinzu.'}
                </AlertDescription>
              </Alert>
              
              <Button
                variant="outline"
                onClick={() => addField([...path, 'properties'])}
                className="mb-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Feld hinzufügen
              </Button>
              
              {field.properties?.map((prop: SchemaField, index: number) => 
                renderField(prop, [...path, 'properties', index.toString()], depth + 1)
              )}
            </div>
          </CardContent>
        )}
      </Card>
    )
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !schema) return

    const sourceIndex = result.source.index
    const destinationIndex = result.destination.index

    setSchema(prev => {
      if (!prev) return prev

      const newFields = Array.from(prev.fields)
      const [removed] = newFields.splice(sourceIndex, 1)
      newFields.splice(destinationIndex, 0, removed)

      return {
        ...prev,
        fields: newFields
      }
    })
  }

  const applyExampleSchema = (example: ExampleSchema) => {
    if (!schema) return

    const convertFields = (fields: ExampleSchemaField[]): SchemaField[] => {
      return fields.map(field => ({
        ...field,
        properties: field.properties ? convertFields(field.properties) : undefined
      }))
    }

    setSchema(prev => {
      if (!prev) return prev
      return {
        ...prev,
        name: example.name,
        description: example.description,
        fields: convertFields(example.fields)
      }
    })

    toast({
      title: 'Beispiel-Schema angewendet',
      description: 'Sie können das Schema jetzt nach Ihren Bedürfnissen anpassen.'
    })
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
      <div className="p-8 text-center text-muted-foreground">
        Schema konnte nicht geladen werden
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Inhaltstypen definieren</h2>
          <p className="text-muted-foreground">
            Legen Sie fest, welche Informationen aus Ihrer Website extrahiert werden sollen.
          </p>
        </div>
        <Button
          variant={hasChanges ? "default" : "secondary"}
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Wird gespeichert...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {hasChanges ? "Änderungen speichern" : "Keine Änderungen"}
            </>
          )}
        </Button>
      </div>

      <Alert>
        <AlertDescription>
          <p className="font-medium mb-2">Tipps für die Erstellung eines effektiven Schemas:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Wählen Sie eine passende Vorlage als Ausgangspunkt</li>
            <li>Passen Sie die Felder an Ihre spezifischen Bedürfnisse an</li>
            <li>Nutzen Sie sprechende Feldnamen für bessere Verständlichkeit</li>
            <li>Markieren Sie wichtige Felder als Pflichtfelder</li>
            <li>Gruppieren Sie zusammengehörige Informationen</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="vorlagen">
        <TabsList>
          <TabsTrigger value="vorlagen">Vorlagen</TabsTrigger>
          <TabsTrigger value="editor">Schema-Editor</TabsTrigger>
          <TabsTrigger value="handler">Handler</TabsTrigger>
        </TabsList>

        <TabsContent value="vorlagen" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEFAULT_SCHEMAS.map((template: DefaultSchema, index: number) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <template.icon className="h-5 w-5" />
                      <h3 className="font-semibold">{template.name}</h3>
                    </div>
                    <Badge variant="secondary">Standard</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="font-medium mb-1">Enthaltene Felder:</p>
                  <ul className="list-disc pl-4">
                    {template.fields.slice(0, 3).map((field: SchemaField, fieldIndex: number) => (
                      <li key={fieldIndex} className="text-sm">
                        {field.name}
                        {field.required && <span className="text-destructive">*</span>}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
            
            <Card className="border-dashed">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <h3 className="font-semibold">Eigene Vorlage</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Erstellen Sie eine neue, benutzerdefinierte Vorlage.
                </p>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" onClick={() => {
                  // Hier Logik für neue Vorlage
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Neue Vorlage erstellen
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="editor">
          <div className="space-y-4">
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                Definieren Sie hier die Felder, die aus Ihrer Website extrahiert werden sollen. 
                Ziehen Sie die Felder per Drag & Drop, um die Reihenfolge anzupassen.
              </AlertDescription>
            </Alert>

            <DragDropContext onDragEnd={(result: DropResult) => {
              if (!result.destination) return
              const fields = Array.from(schema.fields)
              const [removed] = fields.splice(result.source.index, 1)
              fields.splice(result.destination.index, 0, removed)
              setSchema(prev => prev ? { ...prev, fields } : prev)
            }}>
              <Droppable droppableId="fields">
                {(provided: DroppableProvided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                    {schema.fields.map((field, index) => (
                      <Draggable key={field.name} draggableId={field.name} index={index}>
                        {(provided: DraggableProvided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                          >
                            <Card>
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div {...provided.dragHandleProps}>
                                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <CardTitle className="text-base">
                                      {field.name}
                                      {field.required && (
                                        <span className="ml-1 text-destructive">*</span>
                                      )}
                                    </CardTitle>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      const fields = schema.fields.filter((_, i) => i !== index)
                                      setSchema(prev => prev ? { ...prev, fields } : prev)
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <CardDescription>{field.description}</CardDescription>
                              </CardHeader>
                              <CardContent className="grid gap-4">
                                <div className="grid gap-2">
                                  <Label htmlFor={`field-${index}-name`}>Feldname</Label>
                                  <Input
                                    id={`field-${index}-name`}
                                    value={field.name}
                                    onChange={(e) => {
                                      const fields = [...schema.fields]
                                      fields[index] = { ...field, name: e.target.value }
                                      setSchema(prev => prev ? { ...prev, fields } : prev)
                                    }}
                                    placeholder="z.B. titel"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor={`field-${index}-type`}>
                                    <span className="flex items-center gap-2">
                                      Typ
                                      <HoverCard>
                                        <HoverCardTrigger>
                                          <InfoIcon className="h-4 w-4 text-muted-foreground" />
                                        </HoverCardTrigger>
                                        <HoverCardContent>
                                          <p className="text-sm">
                                            Wählen Sie den passenden Datentyp für dieses Feld.
                                            Der Typ bestimmt, wie die Information verarbeitet wird.
                                          </p>
                                        </HoverCardContent>
                                      </HoverCard>
                                    </span>
                                  </Label>
                                  <Select
                                    value={field.type}
                                    onValueChange={(value) => {
                                      const fields = [...schema.fields]
                                      fields[index] = { 
                                        ...field, 
                                        type: value as SchemaField['type']
                                      }
                                      setSchema(prev => prev ? { ...prev, fields } : prev)
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {FIELD_TYPES.map(type => (
                                        <SelectItem key={type.value} value={type.value}>
                                          <div>
                                            <div>{type.label}</div>
                                            <p className="text-xs text-muted-foreground">
                                              {type.description}
                                            </p>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor={`field-${index}-description`}>Beschreibung</Label>
                                  <Textarea
                                    id={`field-${index}-description`}
                                    value={field.description}
                                    onChange={(e) => {
                                      const fields = [...schema.fields]
                                      fields[index] = { ...field, description: e.target.value }
                                      setSchema(prev => prev ? { ...prev, fields } : prev)
                                    }}
                                    placeholder="Wozu dient dieses Feld?"
                                  />
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id={`field-${index}-required`}
                                      checked={field.required}
                                      onChange={(e) => {
                                        const fields = [...schema.fields]
                                        fields[index] = { ...field, required: e.target.checked }
                                        setSchema(prev => prev ? { ...prev, fields } : prev)
                                      }}
                                    />
                                    <Label htmlFor={`field-${index}-required`}>Pflichtfeld</Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id={`field-${index}-array`}
                                      checked={field.isArray}
                                      onChange={(e) => {
                                        const fields = [...schema.fields]
                                        fields[index] = { ...field, isArray: e.target.checked }
                                        setSchema(prev => prev ? { ...prev, fields } : prev)
                                      }}
                                    />
                                    <Label htmlFor={`field-${index}-array`}>Mehrere Werte</Label>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const fields = [...schema.fields]
                fields.push({
                  name: `feld_${fields.length + 1}`,
                  type: 'string',
                  description: '',
                  required: false,
                  isArray: false
                })
                setSchema(prev => prev ? { ...prev, fields } : prev)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Neues Feld hinzufügen
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="handler" className="space-y-4">
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              Verwalten Sie hier die automatisch generierten Handler für verschiedene Content-Typen.
              Handler bestimmen, wie Inhalte verarbeitet und Antworten generiert werden.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(schema.handlers || []).map((handler: Handler, index: number) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5" />
                      <h3 className="font-semibold">{handler.type}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleHandler(handler.type)}
                      >
                        <Badge variant={handler.active ? "default" : "secondary"}>
                          {handler.active ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeHandler(handler.type)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Generiert für {handler.metadata?.keyTopics?.length || 0} Schlüsselthemen
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Antworttypen:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(handler.responses || []).map((response, idx: number) => (
                          <Badge key={idx} variant="outline">
                            {response.type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Schlüsselthemen:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(handler.metadata?.keyTopics || []).map((topic: string, idx: number) => (
                          <Badge key={idx} variant="outline">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Einstellungen:</span>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div>Schwellwert: {handler.settings?.matchThreshold || 0.7}</div>
                        <div>Kontext: {handler.settings?.contextWindow || 3}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 