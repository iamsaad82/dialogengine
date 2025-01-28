'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ParsedMeta } from "@/lib/schemas/template"

type MetadataEditorProps = {
  metadata: ParsedMeta
  onChange: (metadata: ParsedMeta) => void
}

export function MetadataEditor({ metadata, onChange }: MetadataEditorProps) {
  const handleChange = (field: keyof ParsedMeta, value: string) => {
    onChange({
      ...metadata,
      [field]: value
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">SEO Titel</Label>
        <Input
          id="title"
          value={metadata.title}
          onChange={(e) => handleChange('title', e.target.value)}
          maxLength={60}
          placeholder="SEO-optimierter Titel"
        />
        <p className="text-sm text-gray-500">
          {metadata.title.length}/60 Zeichen
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Meta Beschreibung</Label>
        <Input
          id="description"
          value={metadata.description}
          onChange={(e) => handleChange('description', e.target.value)}
          maxLength={160}
          placeholder="SEO-optimierte Beschreibung"
        />
        <p className="text-sm text-gray-500">
          {metadata.description.length}/160 Zeichen
        </p>
      </div>
    </div>
  )
} 