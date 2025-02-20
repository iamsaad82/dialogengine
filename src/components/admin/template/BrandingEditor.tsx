'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from "@/components/ui/button"
import { ImageUploader } from '@/components/ui/upload'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import type { BrandingConfig } from '@/lib/types/template'

interface BrandingEditorProps {
  branding: BrandingConfig
  onChange: (branding: BrandingConfig) => void
  saving?: boolean
}

interface ColorInputProps {
  label: string
  value: string
  onChange: (value: string) => void
}

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Source Sans Pro', label: 'Source Sans Pro' },
  { value: 'Nunito', label: 'Nunito' }
] as const

interface FontSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
}

function FontSelect({ label, value, onChange }: FontSelectProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Schriftart wählen" />
        </SelectTrigger>
        <SelectContent>
          {FONT_OPTIONS.map((font) => (
            <SelectItem key={font.value} value={font.value}>
              <span style={{ fontFamily: font.value }}>{font.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function ColorInput({ label, value, onChange }: ColorInputProps) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2 mt-1">
        <div className="relative">
          <Input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-12 h-12 p-1 rounded cursor-pointer"
          />
          <div 
            className="absolute inset-0 rounded pointer-events-none border border-border"
            style={{ backgroundColor: value }}
          />
        </div>
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono"
          placeholder="#000000"
        />
      </div>
    </div>
  )
}

export function BrandingEditor({ branding, onChange, saving = false }: BrandingEditorProps) {
  const [originalBranding] = useState(branding)
  const [hasChanges, setHasChanges] = useState(false)

  const handleChange = (field: string, value: any) => {
    const updatedBranding = { ...branding }

    // Verarbeite verschachtelte Felder
    if (field.includes('.')) {
      const [category, subfield] = field.split('.')
      if (category === 'colors') {
        updatedBranding.colors = {
          ...updatedBranding.colors,
          [subfield]: value
        }
      } else if (category === 'fonts') {
        updatedBranding.fonts = {
          ...updatedBranding.fonts,
          [subfield]: value
        }
      }
    } else {
      if (field === 'logo') {
        updatedBranding.logo = value
      }
    }

    // Prüfe ob es Änderungen gibt
    const hasChanges = JSON.stringify(updatedBranding) !== JSON.stringify(originalBranding)
    setHasChanges(hasChanges)

    onChange(updatedBranding)
  }

  return (
    <div className="space-y-8">
      {/* Logo Upload */}
      <div>
        <Label>Logo</Label>
        <div className="mt-2 max-w-[200px]">
          <ImageUploader
            currentImage={branding.logo}
            onUpload={(url) => handleChange('logo', url)}
            aspectRatio="square"
            maxSize={500}
          />
        </div>
      </div>

      {/* Farben */}
      <div className="space-y-4">
        <h3 className="font-medium">Farben</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ColorInput
            label="Primärfarbe"
            value={branding.colors.primary}
            onChange={(value) => handleChange('colors.primary', value)}
          />
          <ColorInput
            label="Sekundärfarbe"
            value={branding.colors.secondary}
            onChange={(value) => handleChange('colors.secondary', value)}
          />
          <ColorInput
            label="Akzentfarbe"
            value={branding.colors.accent}
            onChange={(value) => handleChange('colors.accent', value)}
          />
        </div>

        <div className="mt-4 p-4 rounded-lg border bg-muted">
          <p className="text-sm text-muted-foreground mb-2">Farbvorschau:</p>
          <div className="flex gap-2">
            <div 
              className="w-8 h-8 rounded"
              style={{ backgroundColor: branding.colors.primary }}
              title="Primärfarbe"
            />
            <div 
              className="w-8 h-8 rounded"
              style={{ backgroundColor: branding.colors.secondary }}
              title="Sekundärfarbe"
            />
            <div 
              className="w-8 h-8 rounded"
              style={{ backgroundColor: branding.colors.accent }}
              title="Akzentfarbe"
            />
          </div>
        </div>
      </div>

      {/* Schriftarten */}
      <div className="space-y-4">
        <h3 className="font-medium">Schriftarten</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FontSelect
            label="Überschriften"
            value={branding.fonts.heading}
            onChange={(value) => handleChange('fonts.heading', value)}
          />
          <FontSelect
            label="Fließtext"
            value={branding.fonts.body}
            onChange={(value) => handleChange('fonts.body', value)}
          />
        </div>

        <div className="mt-4 p-4 rounded-lg border bg-muted">
          <p className="text-sm text-muted-foreground mb-2">Schriftarten-Vorschau:</p>
          <h4 className="text-xl mb-2" style={{ fontFamily: branding.fonts.heading }}>
            Überschrift in {branding.fonts.heading}
          </h4>
          <p style={{ fontFamily: branding.fonts.body }}>
            Dies ist ein Beispieltext in {branding.fonts.body}. Er zeigt, wie die ausgewählte Schriftart im Fließtext aussieht.
          </p>
        </div>
      </div>

      {/* Speichern Button */}
      <div className="flex justify-end">
        <Button 
          onClick={() => onChange(branding)}
          disabled={saving || !hasChanges}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Wird gespeichert...
            </>
          ) : (
            'Änderungen speichern'
          )}
        </Button>
      </div>
    </div>
  )
} 