'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2 } from 'lucide-react'
import { Template } from '@/lib/types/template'

interface SettingsEditorProps {
  templateId: string
}

export function SettingsEditor({ templateId }: SettingsEditorProps) {
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadTemplate()
  }, [templateId])

  const loadTemplate = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/templates/${templateId}`)
      if (!response.ok) throw new Error('Fehler beim Laden')
      const data = await response.json()
      setTemplate(data)
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Fehler beim Laden der Template-Daten:', error)
      toast({
        title: 'Fehler',
        description: 'Die Template-Daten konnten nicht geladen werden.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!template) return

    try {
      setSaving(true)
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Fehler beim Speichern')
      }
      
      setHasUnsavedChanges(false)
      toast({
        title: 'Erfolg',
        description: 'Die Änderungen wurden gespeichert.'
      })
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Die Änderungen konnten nicht gespeichert werden.'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Keine Template-Daten verfügbar. Bitte laden Sie die Seite neu.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Grundeinstellungen</h2>
          <p className="text-sm text-muted-foreground">
            Verwalten Sie hier die grundlegenden Einstellungen des Templates.
          </p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={saving || !hasUnsavedChanges}
          variant={hasUnsavedChanges ? "default" : "secondary"}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Wird gespeichert...
            </>
          ) : hasUnsavedChanges ? (
            'Änderungen speichern'
          ) : (
            'Keine Änderungen'
          )}
        </Button>
      </div>

      <div className="grid gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={template.name}
            onChange={(e) => {
              setTemplate({ ...template, name: e.target.value })
              setHasUnsavedChanges(true)
            }}
            placeholder="Template Name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Typ</Label>
          <Select
            value={template.type}
            onValueChange={(value) => {
              setTemplate({ ...template, type: value as Template['type'] })
              setHasUnsavedChanges(true)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wählen Sie einen Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NEUTRAL">Neutral</SelectItem>
              <SelectItem value="INDUSTRY">Branchenspezifisch</SelectItem>
              <SelectItem value="CUSTOM">Individuell</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subdomain">Subdomain</Label>
          <Input
            id="subdomain"
            value={template.subdomain || ''}
            onChange={(e) => {
              setTemplate({ ...template, subdomain: e.target.value })
              setHasUnsavedChanges(true)
            }}
            placeholder="subdomain"
          />
          <p className="text-sm text-muted-foreground">
            Die Subdomain muss eindeutig sein und darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={template.active}
            onCheckedChange={(checked) => {
              setTemplate({ ...template, active: checked })
              setHasUnsavedChanges(true)
            }}
          />
          <Label>Template aktiv</Label>
        </div>
      </div>
    </div>
  )
} 