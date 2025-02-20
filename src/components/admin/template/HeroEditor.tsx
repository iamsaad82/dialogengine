import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { validateRequired, getErrorMessage } from "@/lib/utils/validation"
import { useState, useEffect } from "react"

type HeroSection = {
  title: string
  subtitle?: string
  description: string
}

type HeroEditorProps = {
  hero: HeroSection
  onChange: (hero: HeroSection) => void
}

export function HeroEditor({ hero = { title: '', subtitle: '', description: '' }, onChange }: HeroEditorProps) {
  const [errors, setErrors] = useState<Partial<Record<keyof HeroSection, string>>>({})
  const [charCount, setCharCount] = useState({
    title: hero?.title?.length || 0,
    subtitle: hero?.subtitle?.length || 0,
    description: hero?.description?.length || 0
  })

  const handleChange = (field: keyof HeroSection, value: string) => {
    // Update character count
    setCharCount(prev => ({
      ...prev,
      [field]: value.length
    }))

    // Validate field
    const error = field !== 'subtitle' && !validateRequired(value) ? getErrorMessage(field, 'required') : ''
    setErrors(prev => ({
      ...prev,
      [field]: error
    }))

    // Update parent
    onChange({
      ...hero,
      [field]: value
    })
  }

  // Initial validation
  useEffect(() => {
    const newErrors: typeof errors = {}
    Object.entries(hero).forEach(([key, value]) => {
      if (key !== 'subtitle' && !validateRequired(value)) {
        newErrors[key as keyof HeroSection] = getErrorMessage(key, 'required')
      }
    })
    setErrors(newErrors)
  }, [])

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Hero Bereich</h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="heroTitle" className="flex justify-between">
            <span>Überschrift</span>
            <span className="text-muted-foreground text-sm">{charCount.title}/200</span>
          </Label>
          <Input
            id="heroTitle"
            value={hero.title}
            onChange={(e) => handleChange('title', e.target.value)}
            maxLength={200}
            className={errors.title ? 'border-red-500' : ''}
          />
          {errors.title && (
            <p className="text-sm text-red-500 mt-1">{errors.title}</p>
          )}
        </div>

        <div>
          <Label htmlFor="heroSubtitle" className="flex justify-between">
            <span>Untertitel</span>
            <span className="text-muted-foreground text-sm">{charCount.subtitle}/300</span>
          </Label>
          <Input
            id="heroSubtitle"
            value={hero.subtitle}
            onChange={(e) => handleChange('subtitle', e.target.value)}
            maxLength={300}
            className={errors.subtitle ? 'border-red-500' : ''}
          />
          {errors.subtitle && (
            <p className="text-sm text-red-500 mt-1">{errors.subtitle}</p>
          )}
        </div>

        <div>
          <Label htmlFor="heroDescription" className="flex justify-between">
            <span>Beschreibung</span>
            <span className="text-muted-foreground text-sm">{charCount.description}/1000</span>
          </Label>
          <Textarea
            id="heroDescription"
            value={hero.description}
            onChange={(e) => handleChange('description', e.target.value)}
            maxLength={1000}
            rows={4}
            className={errors.description ? 'border-red-500' : ''}
          />
          {errors.description && (
            <p className="text-sm text-red-500 mt-1">{errors.description}</p>
          )}
        </div>
      </div>
    </div>
  )
} 