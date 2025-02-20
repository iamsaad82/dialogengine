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
import type { DocumentPattern } from '@/lib/types/template'

interface PatternEditorProps {
  patterns: DocumentPattern[]
  onChange: (patterns: DocumentPattern[]) => void
}

export function PatternEditor({ patterns = [], onChange }: PatternEditorProps) {
  const [newPattern, setNewPattern] = useState<DocumentPattern>({
    name: '',
    pattern: '',
    required: false,
    examples: [],
    extractMetadata: []
  })

  const handleAdd = () => {
    if (!newPattern.name || !newPattern.pattern) return
    onChange([...patterns, newPattern])
    setNewPattern({
      name: '',
      pattern: '',
      required: false,
      examples: [],
      extractMetadata: []
    })
  }

  const handleRemove = (index: number) => {
    const newPatterns = [...patterns]
    newPatterns.splice(index, 1)
    onChange(newPatterns)
  }

  const handleUpdate = (index: number, field: keyof DocumentPattern, value: any) => {
    const newPatterns = [...patterns]
    newPatterns[index] = {
      ...newPatterns[index],
      [field]: value
    }
    onChange(newPatterns)
  }

  const handleExamplesChange = (index: number, examples: string) => {
    const exampleArray = examples.split('\n').filter(e => e.trim())
    handleUpdate(index, 'examples', exampleArray)
  }

  const safePatterns = Array.isArray(patterns) ? patterns : []

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {safePatterns.map((pattern, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-4">
                <div>
                  <Label className="flex items-center gap-2">
                    Name
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Geben Sie einen beschreibenden Namen für das Dokumentmuster ein</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    value={pattern.name}
                    onChange={(e) => handleUpdate(index, 'name', e.target.value)}
                    placeholder="z.B. Versicherungsantrag, Rechnung, etc."
                  />
                </div>
                
                <div>
                  <Label className="flex items-center gap-2">
                    Beispiele
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Fügen Sie Beispieltexte hinzu (einer pro Zeile)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Textarea
                    value={(pattern.examples || []).join('\n')}
                    onChange={(e) => handleExamplesChange(index, e.target.value)}
                    placeholder="Fügen Sie hier Beispieltexte ein, die diesem Muster entsprechen (einer pro Zeile)"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={pattern.required}
                    onCheckedChange={(checked) => handleUpdate(index, 'required', checked)}
                  />
                  <Label>Dieses Muster muss im Dokument gefunden werden</Label>
                </div>
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
          </div>
        ))}
      </div>

      <div className="p-4 border rounded-lg space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          Neues Dokumentmuster
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Definieren Sie ein neues Muster für die Dokumenterkennung</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </h3>
        
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={newPattern.name}
              onChange={(e) => setNewPattern({ ...newPattern, name: e.target.value })}
              placeholder="z.B. Versicherungsantrag, Rechnung, etc."
            />
          </div>
          
          <div>
            <Label>Beispiele</Label>
            <Textarea
              value={(newPattern.examples || []).join('\n')}
              onChange={(e) => setNewPattern({ 
                ...newPattern, 
                examples: e.target.value.split('\n').filter(e => e.trim())
              })}
              placeholder="Fügen Sie hier Beispieltexte ein, die diesem Muster entsprechen (einer pro Zeile)"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={newPattern.required}
              onCheckedChange={(checked) => setNewPattern({ ...newPattern, required: checked })}
            />
            <Label>Dieses Muster muss im Dokument gefunden werden</Label>
          </div>

          <Button
            onClick={handleAdd}
            disabled={!newPattern.name || !newPattern.examples?.length}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Hinzufügen
          </Button>
        </div>
      </div>
    </div>
  )
} 