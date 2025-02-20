'use client'

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import type { ParsedMeta } from '@/lib/types/template'

interface MetadataEditorProps {
  meta: ParsedMeta
  onChange: (meta: ParsedMeta) => void
}

export function MetadataEditor({ meta, onChange }: MetadataEditorProps) {
  const [newKeyword, setNewKeyword] = useState('')

  const handleChange = (field: keyof ParsedMeta, value: string) => {
    onChange({
      ...meta,
      [field]: value
    })
  }

  const addKeyword = () => {
    if (!newKeyword.trim()) return
    onChange({
      ...meta,
      keywords: [...meta.keywords, newKeyword.trim()]
    })
    setNewKeyword('')
  }

  const removeKeyword = (index: number) => {
    const newKeywords = [...meta.keywords]
    newKeywords.splice(index, 1)
    onChange({
      ...meta,
      keywords: newKeywords
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label>Titel</Label>
            <Input
              value={meta.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Seitentitel"
            />
          </div>

          <div>
            <Label>Domain</Label>
            <Input
              value={meta.domain}
              onChange={(e) => handleChange('domain', e.target.value)}
              placeholder="z.B. example.dialogengine.de"
            />
          </div>

          <div>
            <Label>Kontakt-URL</Label>
            <Input
              value={meta.contactUrl}
              onChange={(e) => handleChange('contactUrl', e.target.value)}
              placeholder="/kontakt"
            />
          </div>

          <div>
            <Label>Service-URL</Label>
            <Input
              value={meta.servicesUrl}
              onChange={(e) => handleChange('servicesUrl', e.target.value)}
              placeholder="/leistungen"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Beschreibung</Label>
            <Textarea
              value={meta.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Meta-Beschreibung der Seite"
              rows={4}
            />
          </div>

          <div>
            <Label>Keywords</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Neues Keyword"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addKeyword()
                    }
                  }}
                />
                <Button onClick={addKeyword} type="button">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {meta.keywords.map((keyword, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md"
                  >
                    <span className="text-sm">{keyword}</span>
                    <button
                      onClick={() => removeKeyword(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}