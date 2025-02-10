'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ParsedBranding } from "@/lib/types/template"
import { ImageUploader } from '@/components/ui/upload'

interface BrandingEditorProps {
  branding: ParsedBranding
  onChange: (branding: ParsedBranding) => void
}

export function BrandingEditor({ branding: initialBranding, onChange }: BrandingEditorProps) {
  const [branding, setBranding] = useState<ParsedBranding>(initialBranding)
  const { toast } = useToast()

  const handleChange = (field: keyof ParsedBranding, value: string) => {
    const updatedBranding = { ...branding, [field]: value }
    setBranding(updatedBranding)
    onChange(updatedBranding)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <div className="space-y-2">
          <div>
            <Label>Logo</Label>
            <ImageUploader
              id="branding-logo"
              label="Logo hochladen"
              value={branding.logo || ''}
              onChange={(url) => handleChange('logo', url)}
              aspectRatio="square"
              maxSize={1}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Primärfarbe</Label>
          <Input
            type="color"
            value={branding.primaryColor}
            onChange={(e) => handleChange('primaryColor', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Sekundärfarbe</Label>
          <Input
            type="color"
            value={branding.secondaryColor}
            onChange={(e) => handleChange('secondaryColor', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Hintergrundfarbe</Label>
          <Input
            type="color"
            value={branding.backgroundColor}
            onChange={(e) => handleChange('backgroundColor', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Textfarbe</Label>
          <Input
            type="color"
            value={branding.textColor}
            onChange={(e) => handleChange('textColor', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Schriftart</Label>
          <Input
            value={branding.font}
            onChange={(e) => handleChange('font', e.target.value)}
            placeholder="Arial, sans-serif"
          />
        </div>
      </div>
    </div>
  )
} 