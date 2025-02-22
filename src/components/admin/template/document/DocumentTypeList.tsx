'use client'

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit2, Trash2 } from "lucide-react"
import type { DocumentTypeDefinition } from '@/lib/types/documentTypes'

interface DocumentTypeListProps {
  documentTypes: DocumentTypeDefinition[]
  onEdit: (type: DocumentTypeDefinition) => void
  onDelete: (type: DocumentTypeDefinition) => void
}

export function DocumentTypeList({ documentTypes, onEdit, onDelete }: DocumentTypeListProps) {
  if (documentTypes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Noch keine Dokumententypen vorhanden.</p>
        <p className="text-sm mt-2">
          Laden Sie Dokumente hoch, um automatisch Typen zu erkennen.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {documentTypes.map(type => (
        <div
          key={type.id}
          className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="space-y-2 flex-grow">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{type.name}</h3>
              <Badge variant={type.metadata.generated ? "secondary" : "default"}>
                {type.metadata.generated ? 'Automatisch erkannt' : 'Manuell definiert'}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">
              {type.description || 'Keine Beschreibung vorhanden'}
            </p>

            <div className="flex flex-wrap gap-2 mt-2">
              {type.patterns.map((pattern, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {pattern.name}
                </Badge>
              ))}
            </div>

            {type.validation.schemas.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {type.validation.schemas.length} Schema(s)
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {type.validation.handlers.length} Handler
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {type.responseConfig.layouts.length} Layout(s)
                </Badge>
              </div>
            )}

            <div className="text-xs text-muted-foreground mt-2">
              Zuletzt aktualisiert: {new Date(type.updatedAt).toLocaleDateString('de-DE', {
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
              title="Dokumententyp bearbeiten"
              onClick={() => onEdit(type)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Dokumententyp löschen"
              onClick={() => onDelete(type)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
} 