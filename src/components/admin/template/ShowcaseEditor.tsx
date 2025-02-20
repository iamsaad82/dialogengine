import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { validateUrl, validateRequired, getErrorMessage } from "@/lib/utils/validation"
import { useState, useEffect } from "react"
import { ImageUploader } from '@/components/ui/upload'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  contact: {
    text: string
    type: string
    value: string
  }
}

type ShowcaseEditorProps = {
  showcase: ShowcaseSection
  onChange: (showcase: ShowcaseSection) => void
}

export function ShowcaseEditor({ showcase = {
  image: '',
  altText: '',
  context: {
    title: '',
    description: ''
  },
  cta: {
    title: '',
    question: ''
  },
  contact: {
    text: '',
    type: 'email',
    value: ''
  }
}, onChange }: ShowcaseEditorProps) {
  const [errors, setErrors] = useState<{
    image?: string
    altText?: string
    'context.title'?: string
    'context.description'?: string
    'cta.title'?: string
    'cta.question'?: string
    'contact.text'?: string
    'contact.value'?: string
  }>({})

  const [charCount, setCharCount] = useState({
    title: showcase?.context?.title?.length || 0,
    description: showcase?.context?.description?.length || 0,
    ctaTitle: showcase?.cta?.title?.length || 0,
    ctaQuestion: showcase?.cta?.question?.length || 0,
    contactText: showcase?.contact?.text?.length || 0
  })

  const handleChange = (field: string, value: string) => {
    let error = ''
    const updatedShowcase = { ...showcase }

    // Validate field and update showcase object
    switch (field) {
      case 'image':
        error = !validateUrl(value) ? getErrorMessage('Bild URL', 'url') : ''
        updatedShowcase.image = value
        break
      case 'altText':
        error = !validateRequired(value) ? getErrorMessage('Alt Text', 'required') : ''
        updatedShowcase.altText = value
        break
      case 'context.title':
        error = !validateRequired(value) ? getErrorMessage('Kontext Titel', 'required') : ''
        updatedShowcase.context = {
          ...updatedShowcase.context,
          title: value
        }
        setCharCount(prev => ({ ...prev, title: value.length }))
        break
      case 'context.description':
        error = !validateRequired(value) ? getErrorMessage('Kontext Beschreibung', 'required') : ''
        updatedShowcase.context = {
          ...updatedShowcase.context,
          description: value
        }
        setCharCount(prev => ({ ...prev, description: value.length }))
        break
      case 'cta.title':
        error = !validateRequired(value) ? getErrorMessage('CTA Titel', 'required') : ''
        updatedShowcase.cta = {
          ...updatedShowcase.cta,
          title: value
        }
        setCharCount(prev => ({ ...prev, ctaTitle: value.length }))
        break
      case 'cta.question':
        error = !validateRequired(value) ? getErrorMessage('CTA Frage', 'required') : ''
        updatedShowcase.cta = {
          ...updatedShowcase.cta,
          question: value
        }
        setCharCount(prev => ({ ...prev, ctaQuestion: value.length }))
        break
      case 'contact.text':
        error = !validateRequired(value) ? getErrorMessage('Kontakt Text', 'required') : ''
        updatedShowcase.contact = {
          ...updatedShowcase.contact,
          text: value
        }
        setCharCount(prev => ({ ...prev, contactText: value.length }))
        break
      case 'contact.type':
        updatedShowcase.contact = {
          ...updatedShowcase.contact,
          type: value
        }
        break
      case 'contact.value':
        error = !validateRequired(value) ? getErrorMessage('Kontakt Wert', 'required') : ''
        updatedShowcase.contact = {
          ...updatedShowcase.contact,
          value: value
        }
        break
    }

    setErrors(prev => ({
      ...prev,
      [field]: error
    }))

    onChange(updatedShowcase)
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
            currentImage={showcase.image || ''}
            onUpload={(url: string) => handleChange('image', url)}
            aspectRatio="landscape"
            maxSize={1000}
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

        {/* Kontakt Bereich */}
        <div className="pt-4 border-t">
          <h4 className="text-base font-medium mb-4">Kontakt</h4>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="contactText" className="flex justify-between">
                <span>Kontakt Text</span>
                <span className="text-muted-foreground text-sm">{charCount.contactText}/200</span>
              </Label>
              <Input
                id="contactText"
                value={showcase.contact?.text || ''}
                onChange={(e) => handleChange('contact.text', e.target.value)}
                maxLength={200}
                className={errors['contact.text'] ? 'border-red-500' : ''}
                placeholder="z.B. Sprechen Sie mit uns"
              />
              {errors['contact.text'] && (
                <p className="text-sm text-red-500 mt-1">{errors['contact.text']}</p>
              )}
            </div>

            <div>
              <Label htmlFor="contactType">Kontakt Typ</Label>
              <Select
                value={showcase.contact?.type || 'email'}
                onValueChange={(value) => handleChange('contact.type', value)}
              >
                <SelectTrigger id="contactType">
                  <SelectValue placeholder="Kontakt Typ wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">E-Mail</SelectItem>
                  <SelectItem value="phone">Telefon</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="contactValue">
                {showcase.contact?.type === 'email' ? 'E-Mail Adresse' : 'Telefonnummer'}
              </Label>
              <Input
                id="contactValue"
                value={showcase.contact?.value || ''}
                onChange={(e) => handleChange('contact.value', e.target.value)}
                type={showcase.contact?.type === 'email' ? 'email' : 'tel'}
                className={errors['contact.value'] ? 'border-red-500' : ''}
                placeholder={showcase.contact?.type === 'email' ? 'kontakt@beispiel.de' : '+49 123 456789'}
              />
              {errors['contact.value'] && (
                <p className="text-sm text-red-500 mt-1">{errors['contact.value']}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 