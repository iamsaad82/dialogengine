'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageUpload } from "@/components/ui/image-upload"
import { ParsedBranding } from "@/lib/types/template"
import { validateUrl, validateRequired, getErrorMessage } from "@/lib/utils/validation"
import { useState, useEffect } from "react"

type BrandingEditorProps = {
  branding: ParsedBranding
  onChange: (branding: ParsedBranding) => void
}

export function BrandingEditor({ branding, onChange }: BrandingEditorProps) {
  const [errors, setErrors] = useState<{
    logo?: string
    primaryColor?: string
    secondaryColor?: string
  }>({})

  const handleChange = (field: keyof ParsedBranding, value: string) => {
    let error = ''

    // Validate field
    if (field === 'logo') {
      error = !validateUrl(value) ? getErrorMessage('Logo URL', 'url') : ''
    } else if (field === 'primaryColor' || field === 'secondaryColor') {
      error = !validateRequired(value) ? getErrorMessage(field === 'primaryColor' ? 'Primärfarbe' : 'Sekundärfarbe', 'required') : ''
      if (!error) {
        // Unterstützt sowohl 3- als auch 6-stellige Hex-Codes
        const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(value)
        if (!isValidHex) {
          error = 'Bitte geben Sie eine gültige Hex-Farbe ein (z.B. #F00 oder #FF0000)'
        } else if (value.length === 4) {
          // Konvertiere 3-stelligen zu 6-stelligen Hex-Code
          const expandedHex = '#' + value.slice(1).split('').map(char => char + char).join('')
          onChange({
            ...branding,
            [field]: expandedHex
          })
          return
        }
      }
    }

    setErrors(prev => ({
      ...prev,
      [field]: error
    }))

    onChange({
      ...branding,
      [field]: value
    })
  }

  // Initial validation
  useEffect(() => {
    const newErrors: typeof errors = {}
    if (!validateUrl(branding.logo)) {
      newErrors.logo = getErrorMessage('Logo URL', 'url')
    }
    if (!validateRequired(branding.primaryColor) || !/^#([0-9A-F]{3}){1,2}$/i.test(branding.primaryColor)) {
      newErrors.primaryColor = getErrorMessage('Primärfarbe', 'required')
    }
    if (!validateRequired(branding.secondaryColor) || !/^#([0-9A-F]{3}){1,2}$/i.test(branding.secondaryColor)) {
      newErrors.secondaryColor = getErrorMessage('Sekundärfarbe', 'required')
    }
    setErrors(newErrors)
  }, [])

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Branding</h3>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <ImageUpload
            id="logo"
            label="Logo"
            value={branding.logo}
            onChange={(url) => handleChange('logo', url)}
            aspectRatio="square"
            maxSize={2}
          />
          {errors.logo && (
            <p className="text-sm text-red-500 mt-1">{errors.logo}</p>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="primaryColor" className="flex justify-between">
              <span>Primärfarbe</span>
              <span className="text-muted-foreground text-sm">Hex-Code</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="primaryColor"
                value={branding.primaryColor}
                onChange={(e) => handleChange('primaryColor', e.target.value)}
                className={errors.primaryColor ? 'border-red-500' : ''}
              />
              <div 
                className="w-10 h-10 rounded border"
                style={{ backgroundColor: branding.primaryColor }}
              />
            </div>
            {errors.primaryColor && (
              <p className="text-sm text-red-500 mt-1">{errors.primaryColor}</p>
            )}
          </div>

          <div>
            <Label htmlFor="secondaryColor" className="flex justify-between">
              <span>Sekundärfarbe</span>
              <span className="text-muted-foreground text-sm">Hex-Code</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="secondaryColor"
                value={branding.secondaryColor}
                onChange={(e) => handleChange('secondaryColor', e.target.value)}
                className={errors.secondaryColor ? 'border-red-500' : ''}
              />
              <div 
                className="w-10 h-10 rounded border"
                style={{ backgroundColor: branding.secondaryColor }}
              />
            </div>
            {errors.secondaryColor && (
              <p className="text-sm text-red-500 mt-1">{errors.secondaryColor}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 