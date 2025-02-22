'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit2, Trash2 } from "lucide-react"
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

interface LayoutListProps {
  layouts: LayoutConfig[]
  onEdit: (layout: LayoutConfig) => void
  onDelete: (layout: LayoutConfig) => void
}

export function LayoutList({ layouts, onEdit, onDelete }: LayoutListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {layouts.map((layout) => (
        <Card key={layout.id} className="relative">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg font-medium">{layout.name}</CardTitle>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(layout)}
                  title="Layout bearbeiten"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(layout)}
                  title="Layout löschen"
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {layout.description}
              </p>
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {layout.config.type}
                </Badge>
                {layout.config.conditions.requiredSchemas.length > 0 && (
                  <Badge variant="outline">
                    {layout.config.conditions.requiredSchemas.length} Schema(s)
                  </Badge>
                )}
                {layout.config.conditions.requiredHandlers.length > 0 && (
                  <Badge variant="outline">
                    {layout.config.conditions.requiredHandlers.length} Handler
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Version {layout.metadata.version}</span>
                <span>
                  {new Date(layout.metadata.lastModified).toLocaleDateString('de-DE')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {layouts.length === 0 && (
        <div className="col-span-full text-center p-8 border rounded-lg">
          <p className="text-muted-foreground">
            Noch keine Layouts definiert. Erstellen Sie ein neues Layout, um zu beginnen.
          </p>
        </div>
      )}
    </div>
  )
} 