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
    <div className="space-y-6">
      {/* SEO Metadaten */}
      <div>
        <h4 className="font-medium mb-4">SEO Metadaten</h4>
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
      </div>

      {/* URL Konfiguration */}
      <div>
        <h4 className="font-medium mb-4">URL Konfiguration</h4>
        <div className="space-y-4">
          <div>
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              value={metadata.domain || ''}
              onChange={(e) => handleChange('domain', e.target.value)}
              placeholder="https://ihre-domain.de"
            />
          </div>

          <div>
            <Label htmlFor="contactUrl">Kontakt URL</Label>
            <Input
              id="contactUrl"
              value={metadata.contactUrl || ''}
              onChange={(e) => handleChange('contactUrl', e.target.value)}
              placeholder="/kontakt"
            />
            <p className="text-sm text-gray-500 mt-1">
              Relativer Pfad zur Kontaktseite (z.B. /kontakt)
            </p>
          </div>

          <div>
            <Label htmlFor="servicesUrl">Services URL</Label>
            <Input
              id="servicesUrl"
              value={metadata.servicesUrl || ''}
              onChange={(e) => handleChange('servicesUrl', e.target.value)}
              placeholder="/leistungen"
            />
            <p className="text-sm text-gray-500 mt-1">
              Relativer Pfad zur Leistungsseite (z.B. /leistungen)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 