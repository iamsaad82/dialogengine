'use client'

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Edit2, Trash2, AlertCircle, CheckCircle } from "lucide-react"
import type { ExtractionSchema } from '@/lib/types/schema'

// Übersetzungsfunktion für extrahierte Typen und Pattern-Namen
const getTranslatedLabel = (text: string): string => {
  const translationMap: Record<string, string> = {
    // Extrahierte Typen und Pattern-Namen
    'Health and Fitness Information': 'Gesundheits- und Fitness-Informationen',
    'Numeric Information': 'Numerische Informationen',
    'Organization Name': 'Organisationsname',
    'Image Caption and URL': 'Bildunterschrift und URL',
    'Informative Article': 'Informationsartikel',
    'Service Description': 'Servicebeschreibung',
    'AOK Branch Listing': 'AOK-Filialauflistung',
    'AOK Branches': 'AOK-Filialen',
    'Telephone numbers': 'Telefonnummern',
    'Date format': 'Datumsformat',
    'URL format': 'URL-Format',
    'Email format': 'E-Mail-Format',
    'List form': 'Listenformat',
    'Hyperlinks': 'Hyperlinks',
    'Dates': 'Datumsangaben',
    'Image links': 'Bildlinks',
    'Sections with double headlines': 'Abschnitte mit Doppelüberschriften',
    'Product/Service': 'Produkt/Service',
    'Section Heading': 'Überschriften',
    'Links': 'Links',
    'Update Date': 'Aktualisierungsdatum',
    'Product Suggestions': 'Produktvorschläge',
    'Informative Web Page': 'Informative Webseite'
  }
  return translationMap[text] || text
}

interface SchemaListProps {
  schemas: ExtractionSchema[]
  onEdit: (schema: ExtractionSchema) => void
  onDelete: (schema: ExtractionSchema) => void
}

export function SchemaList({ schemas, onEdit, onDelete }: SchemaListProps) {
  if (schemas.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Noch keine Schemas vorhanden.</p>
        <p className="text-sm mt-2">
          Starten Sie eine neue Analyse, um Schemas automatisch zu erkennen.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {schemas.map(schema => (
        <div
          key={schema.id}
          className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="space-y-2 flex-grow">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{schema.name}</h3>
              <Badge variant={schema.metadata?.generated ? "secondary" : "default"}>
                {schema.metadata?.generated ? (
                  <AlertCircle className="h-3 w-3 mr-1" />
                ) : (
                  <CheckCircle className="h-3 w-3 mr-1" />
                )}
                {schema.metadata?.generated ? 'Automatisch generiert' : 'Manuell validiert'}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">
              {schema.description || 'Keine Beschreibung vorhanden'}
            </p>

            <div className="flex flex-wrap gap-2 mt-2">
              {schema.fields.patterns.map((pattern, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {getTranslatedLabel(pattern.name)}
                </Badge>
              ))}
            </div>

            {schema.metadata?.extractedTypes && (
              <div className="flex flex-wrap gap-2 mt-2">
                {schema.metadata.extractedTypes.map((type, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary"
                    className="text-xs flex items-center gap-1"
                  >
                    {getTranslatedLabel(type.type)}
                    <span className="opacity-60">
                      {Math.round(type.confidence * 100)}% Übereinstimmung
                    </span>
                  </Badge>
                ))}
              </div>
            )}

            <div className="text-xs text-muted-foreground mt-2">
              Zuletzt aktualisiert: {new Date(schema.updatedAt).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>

          <div className="flex gap-2 ml-4">
            <Button
              variant="ghost"
              size="icon"
              title="Schema bearbeiten"
              onClick={() => onEdit(schema)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Schema löschen"
              onClick={() => onDelete(schema)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
} 