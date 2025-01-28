'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "@/components/ui/image-upload"
import { FeatureEditor } from "./FeatureEditor"
import { ParsedContent } from "@/lib/types/template"
import { validateUrl, validateRequired, getErrorMessage } from "@/lib/utils/validation"
import { useState, useEffect } from "react"
import { HeroEditor } from "./HeroEditor"
import { ShowcaseEditor } from "./ShowcaseEditor"
import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"

type ContentEditorProps = {
  content: ParsedContent
  onChange: (content: ParsedContent) => void
}

export function ContentEditor({ content: initialContent, onChange }: ContentEditorProps) {
  const [localContent, setLocalContent] = useState<ParsedContent>(initialContent || {
    hero: {
      title: '',
      subtitle: '',
      description: ''
    },
    showcase: {
      image: '',
      altText: '',
      context: {
        title: '',
        description: ''
      },
      cta: {
        title: '',
        question: ''
      }
    },
    features: [],
    contact: {
      title: '',
      description: '',
      email: '',
      buttonText: ''
    },
    dialog: {
      title: '',
      description: ''
    }
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    onChange(localContent);
    setIsSaving(false);
  };

  const handleHeroChange = (hero: any) => {
    setLocalContent({
      ...localContent,
      hero
    });
  };

  const handleShowcaseChange = (showcase: any) => {
    setLocalContent({
      ...localContent,
      showcase
    });
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="space-y-4 bg-white rounded-lg border p-6">
        <h4 className="font-medium">Hero</h4>
        <div className="space-y-4">
          <HeroEditor hero={localContent.hero} onChange={handleHeroChange} />
        </div>
      </div>

      {/* Dialog Mode Settings */}
      <div className="space-y-4 bg-white rounded-lg border p-6">
        <h4 className="font-medium">Dialog-Modus Einstellungen</h4>
        <div className="space-y-4">
          <div>
            <Label htmlFor="dialogTitle">Dialog-Titel</Label>
            <Input
              id="dialogTitle"
              value={localContent?.dialog?.title || ''}
              onChange={(e) => setLocalContent({
                ...localContent,
                dialog: { 
                  title: e.target.value,
                  description: localContent?.dialog?.description || ''
                }
              })}
              placeholder="Titel für den Dialog-Modus eingeben"
            />
          </div>

          <div>
            <Label htmlFor="dialogDescription">Dialog-Beschreibung</Label>
            <Textarea
              id="dialogDescription"
              value={localContent?.dialog?.description || ''}
              onChange={(e) => setLocalContent({
                ...localContent,
                dialog: { 
                  title: localContent?.dialog?.title || '',
                  description: e.target.value
                }
              })}
              rows={3}
              placeholder="Beschreibung für den Dialog-Modus eingeben"
            />
          </div>
        </div>
      </div>

      {/* Showcase Section */}
      <div className="space-y-4 bg-white rounded-lg border p-6">
        <h4 className="font-medium">Showcase</h4>
        <div className="space-y-4">
          <ShowcaseEditor showcase={localContent.showcase} onChange={handleShowcaseChange} />
        </div>
      </div>

      {/* Features Section */}
      <div className="space-y-4 bg-white rounded-lg border p-6">
        <h4 className="font-medium">Features</h4>
        <div className="space-y-4">
          <FeatureEditor features={localContent.features} onChange={(features) => setLocalContent({
            ...localContent,
            features
          })} />
        </div>
      </div>

      {/* Contact Section */}
      <div className="space-y-4 bg-white rounded-lg border p-6">
        <h4 className="font-medium">Kontakt</h4>
        <div className="space-y-4">
          <div>
            <Label htmlFor="contactTitle">Titel</Label>
            <Input
              id="contactTitle"
              value={localContent?.contact?.title || ''}
              onChange={(e) => setLocalContent({
                ...localContent,
                contact: { ...localContent.contact, title: e.target.value }
              })}
              placeholder="Titel eingeben"
            />
          </div>

          <div>
            <Label htmlFor="contactDescription">Beschreibung</Label>
            <Textarea
              id="contactDescription"
              value={localContent?.contact?.description || ''}
              onChange={(e) => setLocalContent({
                ...localContent,
                contact: { ...localContent.contact, description: e.target.value }
              })}
              rows={2}
              placeholder="Beschreibung eingeben"
            />
          </div>

          <div>
            <Label htmlFor="contactEmail">E-Mail</Label>
            <Input
              id="contactEmail"
              type="email"
              value={localContent?.contact?.email || ''}
              onChange={(e) => setLocalContent({
                ...localContent,
                contact: { ...localContent.contact, email: e.target.value }
              })}
              placeholder="E-Mail eingeben"
            />
          </div>

          <div>
            <Label htmlFor="contactButtonText">Button Text</Label>
            <Input
              id="contactButtonText"
              value={localContent?.contact?.buttonText || ''}
              onChange={(e) => setLocalContent({
                ...localContent,
                contact: { ...localContent.contact, buttonText: e.target.value }
              })}
              placeholder="Button Text eingeben"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          <Save className="w-4 h-4 mr-2" />
          Änderungen speichern
        </Button>
      </div>
    </div>
  )
} 