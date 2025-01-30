'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "@/components/ui/image-upload"
import { FeatureEditor } from "./FeatureEditor"
import { ParsedContent, ParsedBranding, ParsedBot, ParsedMeta, Feature } from "@/lib/types/template"
import { validateUrl, validateRequired, getErrorMessage } from "@/lib/utils/validation"
import { useState, useEffect } from "react"
import { HeroEditor } from "./HeroEditor"
import { ShowcaseEditor } from "./ShowcaseEditor"
import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"
import { TabsContent } from "@/components/ui/tabs"

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
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!hasChanges) return;
    
    setIsSaving(true);
    try {
      const contentToSave = {
        ...localContent,
        features: localContent.features || []
      };
      
      const jsonContent = JSON.stringify(contentToSave);
      
      await onChange({
        ...contentToSave,
        jsonContent
      });
      
      setHasChanges(false);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLocalChange = (field: keyof ParsedContent, value: any) => {
    console.log('Änderung in Feld:', field, 'Neuer Wert:', value);
    
    setLocalContent(prev => {
      const newContent = {
        ...prev,
        [field]: value
      };
      
      if (field === 'features') {
        newContent.features = Array.isArray(value) ? value : [];
        console.log('Neue Features:', newContent.features);
      }
      
      return newContent;
    });
    setHasChanges(true);
  };

  const handleFeatureChange = (features: Feature[]) => {
    handleLocalChange('features', features);
  };

  const handleHeroChange = (hero: any) => {
    handleLocalChange('hero', hero);
  };

  const handleShowcaseChange = (showcase: any) => {
    handleLocalChange('showcase', showcase);
  };

  const handleContactChange = (field: string, value: string) => {
    setLocalContent(prev => ({
      ...prev,
      contact: {
        ...prev.contact,
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  useEffect(() => {
    if (!localContent.features) {
      setLocalContent(prev => ({
        ...prev,
        features: []
      }));
    }
  }, []);

  useEffect(() => {
    console.log('Aktuelle Features:', localContent.features);
  }, [localContent.features]);

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
              onChange={(e) => {
                handleLocalChange('dialog', {
                  ...localContent.dialog,
                  title: e.target.value
                });
              }}
              placeholder="Titel für den Dialog-Modus eingeben"
            />
          </div>

          <div>
            <Label htmlFor="dialogDescription">Dialog-Beschreibung</Label>
            <Textarea
              id="dialogDescription"
              value={localContent?.dialog?.description || ''}
              onChange={(e) => {
                handleLocalChange('dialog', {
                  ...localContent.dialog,
                  description: e.target.value
                });
              }}
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
          <FeatureEditor 
            features={localContent.features || []} 
            onChange={(features) => handleLocalChange('features', features)}
          />
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
              onChange={(e) => handleContactChange('title', e.target.value)}
              placeholder="Titel eingeben"
            />
          </div>

          <div>
            <Label htmlFor="contactDescription">Beschreibung</Label>
            <Textarea
              id="contactDescription"
              value={localContent?.contact?.description || ''}
              onChange={(e) => handleContactChange('description', e.target.value)}
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
              onChange={(e) => handleContactChange('email', e.target.value)}
              placeholder="E-Mail eingeben"
            />
          </div>

          <div>
            <Label htmlFor="contactButtonText">Button Text</Label>
            <Input
              id="contactButtonText"
              value={localContent?.contact?.buttonText || ''}
              onChange={(e) => handleContactChange('buttonText', e.target.value)}
              placeholder="Button Text eingeben"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button 
          onClick={handleSave}
          disabled={isSaving || !hasChanges} 
          size="lg"
          variant={hasChanges ? "default" : "outline"}
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Wird gespeichert..." : hasChanges ? "Änderungen speichern" : "Keine Änderungen"}
        </Button>
      </div>
    </div>
  )
} 