'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FeatureEditor } from "./FeatureEditor"
import { ParsedContent, Feature } from "@/lib/types/template"
import { useState, useEffect } from "react"
import { HeroEditor } from "./HeroEditor"
import { ShowcaseEditor } from "./ShowcaseEditor"
import { Button } from "@/components/ui/button"
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from "lucide-react"

interface ContentEditorProps {
  content: ParsedContent
  onChange: (content: ParsedContent) => void
}

export function ContentEditor({ content, onChange }: ContentEditorProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const { toast } = useToast()

  const handleChange = (key: keyof ParsedContent, value: any) => {
    setHasUnsavedChanges(true)
    onChange({ ...content, [key]: value })
  }

  return (
    <div className="space-y-6">
      <HeroEditor
        hero={content.hero}
        onChange={(hero) => handleChange('hero', hero)}
      />
      
      <ShowcaseEditor
        showcase={content.showcase}
        onChange={(showcase) => handleChange('showcase', showcase)}
      />
      
      <FeatureEditor
        features={content.features}
        onChange={(features) => handleChange('features', features)}
      />
      
      {saving && (
        <Button disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Speichert...
        </Button>
      )}
    </div>
  )
} 