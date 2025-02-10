import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { validateUrl, validateRequired, getErrorMessage } from "@/lib/utils/validation"
import { useState, useEffect } from "react"
import { ImageUploader } from '@/components/ui/upload'

type ShowcaseSection = {
  image: string
  altText: string
  context: {
    title: string
    description: string
  }
  cta: {
    title: string
    question: string
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
    'cta.title'?: string
    'cta.question'?: string
  }>({})

  const [charCount, setCharCount] = useState({
    title: showcase.context.title.length,
    description: showcase.context.description.length,
    ctaTitle: showcase.cta?.title?.length || 0,
    ctaQuestion: showcase.cta?.question?.length || 0
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
    } else if (field === 'cta.title') {
      setCharCount(prev => ({
        ...prev,
        ctaTitle: value.length
      }))
      error = !validateRequired(value) ? getErrorMessage('CTA Titel', 'required') : ''
      onChange({
        ...showcase,
        cta: {
          ...showcase.cta,
          title: value
        }
      })
    } else if (field === 'cta.question') {
      setCharCount(prev => ({
        ...prev,
        ctaQuestion: value.length
      }))
      error = !validateRequired(value) ? getErrorMessage('CTA Frage', 'required') : ''
      onChange({
        ...showcase,
        cta: {
          ...showcase.cta,
          question: value
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
    if (!validateRequired(showcase.cta?.title)) {
      newErrors['cta.title'] = getErrorMessage('CTA Titel', 'required')
    }
    if (!validateRequired(showcase.cta?.question)) {
      newErrors['cta.question'] = getErrorMessage('CTA Frage', 'required')
    }
    setErrors(newErrors)
  }, [])

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Showcase Bereich</h3>
      <div className="space-y-4">
        <div>
          <Label>Bild</Label>
          <ImageUploader
            id="showcase-image"
            label="Showcase Bild hochladen"
            value={showcase.image}
            onChange={(url) => {
              console.log('Neues Showcase-Bild URL:', url);
              // Stelle sicher, dass die URL mit einem Slash beginnt
              const formattedUrl = url.startsWith('/') ? url : `/${url}`;
              console.log('Formatierte URL:', formattedUrl);
              handleChange('image', formattedUrl);
            }}
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

        {/* CTA Bereich */}
        <div className="pt-4 border-t">
          <h4 className="text-base font-medium mb-4">Call to Action</h4>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="ctaTitle" className="flex justify-between">
                <span>CTA Titel</span>
                <span className="text-muted-foreground text-sm">{charCount.ctaTitle}/200</span>
              </Label>
              <Input
                id="ctaTitle"
                value={showcase.cta?.title || ''}
                onChange={(e) => handleChange('cta.title', e.target.value)}
                maxLength={200}
                className={errors['cta.title'] ? 'border-red-500' : ''}
                placeholder="z.B. Oder fragen Sie einfach:"
              />
              {errors['cta.title'] && (
                <p className="text-sm text-red-500 mt-1">{errors['cta.title']}</p>
              )}
            </div>

            <div>
              <Label htmlFor="ctaQuestion" className="flex justify-between">
                <span>CTA Frage</span>
                <span className="text-muted-foreground text-sm">{charCount.ctaQuestion}/500</span>
              </Label>
              <Input
                id="ctaQuestion"
                value={showcase.cta?.question || ''}
                onChange={(e) => handleChange('cta.question', e.target.value)}
                maxLength={500}
                className={errors['cta.question'] ? 'border-red-500' : ''}
                placeholder="z.B. Wie funktioniert Ihr Content Management?"
              />
              {errors['cta.question'] && (
                <p className="text-sm text-red-500 mt-1">{errors['cta.question']}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 