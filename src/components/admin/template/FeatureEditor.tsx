'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Feature, IconType } from "@/lib/types/template"
import { validateRequired, getErrorMessage } from "@/lib/utils/validation"
import { useState, useEffect } from "react"
import { Zap, Clock, Brain, Blocks, Plus, Trash2 } from "lucide-react"

type FeatureEditorProps = {
  features: Feature[]
  onChange: (features: Feature[]) => void
}

const ICONS: { value: IconType; label: string; icon: React.ReactNode }[] = [
  { value: 'zap', label: 'Blitz', icon: <Zap className="w-4 h-4" /> },
  { value: 'clock', label: 'Uhr', icon: <Clock className="w-4 h-4" /> },
  { value: 'brain', label: 'Gehirn', icon: <Brain className="w-4 h-4" /> },
  { value: 'blocks', label: 'Blöcke', icon: <Blocks className="w-4 h-4" /> }
]

export function FeatureEditor({ features = [], onChange }: FeatureEditorProps) {
  const [errors, setErrors] = useState<{
    [key: number]: {
      icon?: string
      title?: string
      description?: string
    }
  }>({})

  // Stelle sicher, dass features immer ein Array ist
  useEffect(() => {
    if (!Array.isArray(features)) {
      onChange([]);
    }
  }, [features, onChange]);

  const handleChange = (index: number, field: keyof Feature, value: string) => {
    let error = ''

    // Validate field
    error = !validateRequired(value) ? getErrorMessage(field, 'required') : ''

    setErrors(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: error
      }
    }))

    const newFeatures = [...(Array.isArray(features) ? features : [])]
    newFeatures[index] = {
      ...newFeatures[index],
      [field]: value
    }
    onChange(newFeatures)
  }

  const addFeature = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();  // Verhindert Bubble-Up des Events
    const newFeatures = [
      ...(Array.isArray(features) ? features : []),
      {
        icon: 'zap',
        title: '',
        description: ''
      }
    ];
    onChange(newFeatures);
  }

  const removeFeature = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();  // Verhindert Bubble-Up des Events
    const newFeatures = (Array.isArray(features) ? features : []).filter((_, i) => i !== index);
    onChange(newFeatures);
  }

  // Initial validation
  useEffect(() => {
    const newErrors: typeof errors = {}

    features.forEach((feature, index) => {
      if (!validateRequired(feature.icon)) {
        newErrors[index] = { ...newErrors[index], icon: getErrorMessage('Icon', 'required') }
      }
      if (!validateRequired(feature.title)) {
        newErrors[index] = { ...newErrors[index], title: getErrorMessage('Titel', 'required') }
      }
      if (!validateRequired(feature.description)) {
        newErrors[index] = { ...newErrors[index], description: getErrorMessage('Beschreibung', 'required') }
      }
    })

    setErrors(newErrors)
  }, [])

  return (
    <div className="space-y-4">
      {features.map((feature, index) => (
        <div key={index} className="p-4 border rounded-lg space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Feature {index + 1}</h4>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => removeFeature(index, e)}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`feature-${index}-icon`}>Icon</Label>
              <Select
                value={feature.icon}
                onValueChange={(value) => handleChange(index, 'icon', value as IconType)}
              >
                <SelectTrigger
                  id={`feature-${index}-icon`}
                  className={errors[index]?.icon ? 'border-red-500' : ''}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICONS.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>
                      <div className="flex items-center gap-2">
                        {icon.icon}
                        <span>{icon.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors[index]?.icon && (
                <p className="text-sm text-red-500 mt-1">{errors[index].icon}</p>
              )}
            </div>

            <div>
              <Label htmlFor={`feature-${index}-title`}>Titel</Label>
              <Input
                id={`feature-${index}-title`}
                value={feature.title}
                onChange={(e) => handleChange(index, 'title', e.target.value)}
                className={errors[index]?.title ? 'border-red-500' : ''}
              />
              {errors[index]?.title && (
                <p className="text-sm text-red-500 mt-1">{errors[index].title}</p>
              )}
            </div>

            <div className="col-span-2">
              <Label htmlFor={`feature-${index}-description`}>Beschreibung</Label>
              <Textarea
                id={`feature-${index}-description`}
                value={feature.description}
                onChange={(e) => handleChange(index, 'description', e.target.value)}
                className={errors[index]?.description ? 'border-red-500' : ''}
                rows={2}
              />
              {errors[index]?.description && (
                <p className="text-sm text-red-500 mt-1">{errors[index].description}</p>
              )}
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addFeature}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        Feature hinzufügen
      </Button>
    </div>
  )
} 