'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ParsedMeta } from '@/lib/types/template'

interface MetadataEditorProps {
  meta: ParsedMeta
  onChange: (meta: ParsedMeta) => void
}

export function MetadataEditor({ meta: initialMeta, onChange }: MetadataEditorProps) {
  const [meta, setMeta] = useState<ParsedMeta>(initialMeta)
  const { toast } = useToast()

  const handleChange = (field: keyof ParsedMeta, value: string) => {
    const updatedMeta = { ...meta, [field]: value }
    setMeta(updatedMeta)
    onChange(updatedMeta)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Titel</Label>
        <Input
          value={meta.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Geben Sie einen Titel ein"
        />
      </div>

      <div className="space-y-2">
        <Label>Beschreibung</Label>
        <Textarea
          value={meta.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Geben Sie eine Beschreibung ein"
        />
      </div>

      <div className="space-y-2">
        <Label>Domain</Label>
        <Input
          value={meta.domain || ''}
          onChange={(e) => handleChange('domain', e.target.value)}
          placeholder="example.com"
        />
      </div>

      <div className="space-y-2">
        <Label>Kontakt-URL</Label>
        <Input
          value={meta.contactUrl || ''}
          onChange={(e) => handleChange('contactUrl', e.target.value)}
          placeholder="https://example.com/contact"
        />
      </div>

      <div className="space-y-2">
        <Label>Services-URL</Label>
        <Input
          value={meta.servicesUrl || ''}
          onChange={(e) => handleChange('servicesUrl', e.target.value)}
          placeholder="https://example.com/services"
        />
      </div>
    </div>
  )
} 