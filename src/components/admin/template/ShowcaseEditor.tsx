import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { validateUrl, validateRequired, getErrorMessage } from "@/lib/utils/validation"
import { useState, useEffect } from "react"
import { ImageUpload } from "@/components/ui/image-upload"

type ShowcaseSection = {
  image: string
  altText: string
  context: {
    title: string
    description: string
  }
}

type ShowcaseEditorProps = {
  showcase: ShowcaseSection
  onChange: (showcase: ShowcaseSection) => void
}

export function ShowcaseEditor({ showcase, onChange }: ShowcaseEditorProps) {
  const [errors, setErrors] = useState<{
    image?: string
    altText?: string
    'context.title'?: string
    'context.description'?: string
  }>({})

  const [charCount, setCharCount] = useState({
    title: showcase.context.title.length,
    description: showcase.context.description.length
  })

  const handleChange = (field: string, value: string) => {
    let error = ''

    // Validate field
    if (field === 'image') {
      error = !validateUrl(value) ? getErrorMessage('Bild URL', 'url') : ''
      onChange({
        ...showcase,
        image: value
      })
    } else if (field === 'altText') {
      error = !validateRequired(value) ? getErrorMessage('Alt Text', 'required') : ''
      onChange({
        ...showcase,
        altText: value
      })
    } else if (field === 'context.title') {
      setCharCount(prev => ({
        ...prev,
        title: value.length
      }))
      error = !validateRequired(value) ? getErrorMessage('Kontext Titel', 'required') : ''
      onChange({
        ...showcase,
        context: {
          ...showcase.context,
          title: value
        }
      })
    } else if (field === 'context.description') {
      setCharCount(prev => ({
        ...prev,
        description: value.length
      }))
      error = !validateRequired(value) ? getErrorMessage('Kontext Beschreibung', 'required') : ''
      onChange({
        ...showcase,
        context: {
          ...showcase.context,
          description: value
        }
      })
    }

    setErrors(prev => ({
      ...prev,
      [field]: error
    }))
  }

  // Initial validation
  useEffect(() => {
    const newErrors: typeof errors = {}
    if (!validateUrl(showcase.image)) {
      newErrors.image = getErrorMessage('Bild URL', 'url')
    }
    if (!validateRequired(showcase.altText)) {
      newErrors.altText = getErrorMessage('Alt Text', 'required')
    }
    if (!validateRequired(showcase.context.title)) {
      newErrors['context.title'] = getErrorMessage('Kontext Titel', 'required')
    }
    if (!validateRequired(showcase.context.description)) {
      newErrors['context.description'] = getErrorMessage('Kontext Beschreibung', 'required')
    }
    setErrors(newErrors)
  }, [])

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Showcase Bereich</h3>
      <div className="space-y-4">
        <div>
          <Label>Bild</Label>
          <ImageUpload
            id="showcase-image"
            label="Showcase Bild hochladen"
            value={showcase.image}
            onChange={(url) => handleChange('image', url)}
          />
          {errors.image && (
            <p className="text-sm text-red-500 mt-1">{errors.image}</p>
          )}
        </div>

        <div>
          <Label htmlFor="showcaseAlt">Alt Text</Label>
          <Input
            id="showcaseAlt"
            value={showcase.altText}
            onChange={(e) => handleChange('altText', e.target.value)}
            className={errors.altText ? 'border-red-500' : ''}
          />
          {errors.altText && (
            <p className="text-sm text-red-500 mt-1">{errors.altText}</p>
          )}
        </div>

        <div>
          <Label htmlFor="showcaseTitle" className="flex justify-between">
            <span>Kontext Titel</span>
            <span className="text-muted-foreground text-sm">{charCount.title}/200</span>
          </Label>
          <Input
            id="showcaseTitle"
            value={showcase.context.title}
            onChange={(e) => handleChange('context.title', e.target.value)}
            maxLength={200}
            className={errors['context.title'] ? 'border-red-500' : ''}
          />
          {errors['context.title'] && (
            <p className="text-sm text-red-500 mt-1">{errors['context.title']}</p>
          )}
        </div>

        <div>
          <Label htmlFor="showcaseDescription" className="flex justify-between">
            <span>Kontext Beschreibung</span>
            <span className="text-muted-foreground text-sm">{charCount.description}/500</span>
          </Label>
          <Textarea
            id="showcaseDescription"
            value={showcase.context.description}
            onChange={(e) => handleChange('context.description', e.target.value)}
            maxLength={500}
            rows={3}
            className={errors['context.description'] ? 'border-red-500' : ''}
          />
          {errors['context.description'] && (
            <p className="text-sm text-red-500 mt-1">{errors['context.description']}</p>
          )}
        </div>
      </div>
    </div>
  )
} 