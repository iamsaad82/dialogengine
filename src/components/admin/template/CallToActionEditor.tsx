import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { validateUrl, validateRequired, getErrorMessage } from "@/lib/utils/validation"
import { useState, useEffect } from "react"

type CallToActionSection = {
  title: string
  description: string
  primaryButton: {
    text: string
    url: string
  }
}

type CallToActionEditorProps = {
  callToAction: CallToActionSection
  onChange: (callToAction: CallToActionSection) => void
}

export function CallToActionEditor({ callToAction, onChange }: CallToActionEditorProps) {
  const [errors, setErrors] = useState<{
    title?: string
    description?: string
    'primaryButton.text'?: string
    'primaryButton.url'?: string
  }>({})

  const [charCount, setCharCount] = useState({
    title: callToAction.title.length,
    description: callToAction.description.length,
    buttonText: callToAction.primaryButton.text.length
  })

  const handleChange = (field: string, value: string) => {
    let error = ''

    // Validate field
    if (field === 'title') {
      setCharCount(prev => ({
        ...prev,
        title: value.length
      }))
      error = !validateRequired(value) ? getErrorMessage('Überschrift', 'required') : ''
      onChange({
        ...callToAction,
        title: value
      })
    } else if (field === 'description') {
      setCharCount(prev => ({
        ...prev,
        description: value.length
      }))
      error = !validateRequired(value) ? getErrorMessage('Beschreibung', 'required') : ''
      onChange({
        ...callToAction,
        description: value
      })
    } else if (field === 'primaryButton.text') {
      setCharCount(prev => ({
        ...prev,
        buttonText: value.length
      }))
      error = !validateRequired(value) ? getErrorMessage('Button Text', 'required') : ''
      onChange({
        ...callToAction,
        primaryButton: {
          ...callToAction.primaryButton,
          text: value
        }
      })
    } else if (field === 'primaryButton.url') {
      error = !validateUrl(value) ? getErrorMessage('Button URL', 'url') : ''
      onChange({
        ...callToAction,
        primaryButton: {
          ...callToAction.primaryButton,
          url: value
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
    if (!validateRequired(callToAction.title)) {
      newErrors.title = getErrorMessage('Überschrift', 'required')
    }
    if (!validateRequired(callToAction.description)) {
      newErrors.description = getErrorMessage('Beschreibung', 'required')
    }
    if (!validateRequired(callToAction.primaryButton.text)) {
      newErrors['primaryButton.text'] = getErrorMessage('Button Text', 'required')
    }
    if (!validateUrl(callToAction.primaryButton.url)) {
      newErrors['primaryButton.url'] = getErrorMessage('Button URL', 'url')
    }
    setErrors(newErrors)
  }, [])

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Call to Action</h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="ctaTitle" className="flex justify-between">
            <span>Überschrift</span>
            <span className="text-muted-foreground text-sm">{charCount.title}/200</span>
          </Label>
          <Input
            id="ctaTitle"
            value={callToAction.title}
            onChange={(e) => handleChange('title', e.target.value)}
            maxLength={200}
            className={errors.title ? 'border-red-500' : ''}
          />
          {errors.title && (
            <p className="text-sm text-red-500 mt-1">{errors.title}</p>
          )}
        </div>

        <div>
          <Label htmlFor="ctaDescription" className="flex justify-between">
            <span>Beschreibung</span>
            <span className="text-muted-foreground text-sm">{charCount.description}/500</span>
          </Label>
          <Textarea
            id="ctaDescription"
            value={callToAction.description}
            onChange={(e) => handleChange('description', e.target.value)}
            maxLength={500}
            rows={3}
            className={errors.description ? 'border-red-500' : ''}
          />
          {errors.description && (
            <p className="text-sm text-red-500 mt-1">{errors.description}</p>
          )}
        </div>

        <div>
          <Label htmlFor="ctaButtonText" className="flex justify-between">
            <span>Button Text</span>
            <span className="text-muted-foreground text-sm">{charCount.buttonText}/50</span>
          </Label>
          <Input
            id="ctaButtonText"
            value={callToAction.primaryButton.text}
            onChange={(e) => handleChange('primaryButton.text', e.target.value)}
            maxLength={50}
            className={errors['primaryButton.text'] ? 'border-red-500' : ''}
          />
          {errors['primaryButton.text'] && (
            <p className="text-sm text-red-500 mt-1">{errors['primaryButton.text']}</p>
          )}
        </div>

        <div>
          <Label htmlFor="ctaButtonUrl">Button URL</Label>
          <Input
            id="ctaButtonUrl"
            type="url"
            value={callToAction.primaryButton.url}
            onChange={(e) => handleChange('primaryButton.url', e.target.value)}
            className={errors['primaryButton.url'] ? 'border-red-500' : ''}
          />
          {errors['primaryButton.url'] && (
            <p className="text-sm text-red-500 mt-1">{errors['primaryButton.url']}</p>
          )}
        </div>
      </div>
    </div>
  )
} 