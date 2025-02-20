'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, HelpCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { MetadataDefinition } from '@/lib/types/template'

const FIELD_TYPES = [
  { value: 'string', label: 'Text' },
  { value: 'string[]', label: 'Text-Liste' },
  { value: 'date', label: 'Datum' },
  { value: 'boolean', label: 'Ja/Nein' },
  { value: 'number', label: 'Zahl' },
  { value: 'object', label: 'Objekt' }
] as const

interface MetadataEditorProps {
  metadata: MetadataDefinition[]
  onChange: (metadata: MetadataDefinition[]) => void
}

export function MetadataEditor({ metadata = [], onChange }: MetadataEditorProps) {
  const [newField, setNewField] = useState<MetadataDefinition>({
    name: '',
    type: 'string',
    required: false,
    description: '',
    pattern: '',
    defaultValue: undefined
  })

  const handleAdd = () => {
    if (!newField.name) return
    onChange([...metadata, newField])
    setNewField({
      name: '',
      type: 'string',
      required: false,
      description: '',
      pattern: '',
      defaultValue: undefined
    })
  }

  const handleRemove = (index: number) => {
    const newMetadata = [...metadata]
    newMetadata.splice(index, 1)
    onChange(newMetadata)
  }

  const handleUpdate = (index: number, field: keyof MetadataDefinition, value: any) => {
    const newMetadata = [...metadata]
    newMetadata[index] = {
      ...newMetadata[index],
      [field]: value
    }
    onChange(newMetadata)
  }

  const safeMetadata = Array.isArray(metadata) ? metadata : []

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {safeMetadata.map((field, index) => (
          <div key={index} className="flex items-start space-x-4 p-4 border rounded-lg">
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <Label>Name</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Der Name des Metadaten-Feldes</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    value={field.name}
                    onChange={(e) => handleUpdate(index, 'name', e.target.value)}
                    placeholder="z.B. title"
                  />
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <Label>Typ</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Der Datentyp des Feldes</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    value={field.type}
                    onValueChange={(value) => handleUpdate(index, 'type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Typ auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <Label>Beschreibung</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Eine kurze Beschreibung des Feldes</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Textarea
                  value={field.description}
                  onChange={(e) => handleUpdate(index, 'description', e.target.value)}
                  placeholder="Beschreibung des Feldes..."
                />
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={field.required}
                    onCheckedChange={(checked) => handleUpdate(index, 'required', checked)}
                  />
                  <Label>Erforderlich</Label>
                </div>
              </div>

              {field.type === 'string' && (
                <div>
                  <Label>Pattern (optional)</Label>
                  <Input
                    value={field.pattern || ''}
                    onChange={(e) => handleUpdate(index, 'pattern', e.target.value)}
                    placeholder="Regex-Pattern"
                  />
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(index)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-4 p-4 border rounded-lg">
        <h3 className="font-medium">Neues Metadaten-Feld hinzufügen</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input
                value={newField.name}
                onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                placeholder="z.B. title"
              />
            </div>

            <div>
              <Label>Typ</Label>
              <Select
                value={newField.type}
                onValueChange={(value) => setNewField({ ...newField, type: value as MetadataDefinition['type'] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Typ auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Beschreibung</Label>
            <Textarea
              value={newField.description}
              onChange={(e) => setNewField({ ...newField, description: e.target.value })}
              placeholder="Beschreibung des Feldes..."
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={newField.required}
                onCheckedChange={(checked) => setNewField({ ...newField, required: checked })}
              />
              <Label>Erforderlich</Label>
            </div>
          </div>

          {newField.type === 'string' && (
            <div>
              <Label>Pattern (optional)</Label>
              <Input
                value={newField.pattern || ''}
                onChange={(e) => setNewField({ ...newField, pattern: e.target.value })}
                placeholder="Regex-Pattern"
              />
            </div>
          )}

          <Button onClick={handleAdd} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Hinzufügen
          </Button>
        </div>
      </div>
    </div>
  )
} 