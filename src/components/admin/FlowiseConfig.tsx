'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2 } from 'lucide-react'

interface ResponseRule {
  pattern: string
  type: 'info' | 'service' | 'link' | 'contact' | 'product' | 'location' | 'faq' | 'event' | 'download' | 'video'
  metadata?: {
    url?: string
    image?: string
    price?: string
    date?: string
    address?: string
    buttonText?: string
    videoUrl?: string
  }
}

interface DefaultButton {
  text: string
  url: string
}

interface FlowiseConfig {
  url: string
  apiKey: string
  responseRules: ResponseRule[]
  defaultButtons: DefaultButton[]
}

export default function FlowiseConfig() {
  const [config, setConfig] = useState<FlowiseConfig>({
    url: '',
    apiKey: '',
    responseRules: [],
    defaultButtons: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/flowise')
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Konfiguration')
      }
      const data = await response.json()
      setConfig(data)
    } catch (error) {
      console.error('Error loading config:', error)
      setError('Konfiguration konnte nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }

  const addRule = () => {
    setConfig(prev => ({
      ...prev,
      responseRules: [...prev.responseRules, {
        pattern: '',
        type: 'info'
      }]
    }))
  }

  const updateRule = (index: number, field: keyof ResponseRule | string, value: string) => {
    setConfig(prev => {
      const newRules = [...prev.responseRules]
      if (field === 'pattern' || field === 'type') {
        newRules[index] = {
          ...newRules[index],
          [field]: value
        }
      } else {
        newRules[index] = {
          ...newRules[index],
          metadata: {
            ...newRules[index].metadata,
            [field]: value
          }
        }
      }
      return {
        ...prev,
        responseRules: newRules
      }
    })
  }

  const removeRule = (index: number) => {
    setConfig(prev => ({
      ...prev,
      responseRules: prev.responseRules.filter((_, i) => i !== index)
    }))
  }

  const addButton = () => {
    setConfig(prev => ({
      ...prev,
      defaultButtons: [...prev.defaultButtons, {
        text: '',
        url: ''
      }]
    }))
  }

  const updateButton = (index: number, field: keyof DefaultButton, value: string) => {
    setConfig(prev => {
      const newButtons = [...prev.defaultButtons]
      newButtons[index] = {
        ...newButtons[index],
        [field]: value
      }
      return {
        ...prev,
        defaultButtons: newButtons
      }
    })
  }

  const removeButton = (index: number) => {
    setConfig(prev => ({
      ...prev,
      defaultButtons: prev.defaultButtons.filter((_, i) => i !== index)
    }))
  }

  const saveConfig = async () => {
    try {
      setError(null)
      const response = await fetch('/api/flowise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Speichern')
      }

      // Zeige Erfolgsmeldung
      alert('Konfiguration erfolgreich gespeichert')
    } catch (error) {
      console.error('Error saving config:', error)
      setError(error instanceof Error ? error.message : 'Fehler beim Speichern')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Lade Konfiguration...</div>
  }

  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <Tabs defaultValue="connection" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="connection">Verbindung</TabsTrigger>
          <TabsTrigger value="rules">Antwortregeln</TabsTrigger>
          <TabsTrigger value="buttons">Standard-Buttons</TabsTrigger>
        </TabsList>

        <TabsContent value="connection">
          <div className="space-y-6">
            <div>
              <Label htmlFor="url">Flowise URL</Label>
              <Input
                id="url"
                value={config.url}
                onChange={e => setConfig(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://your-flowise-instance.com"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={config.apiKey}
                onChange={e => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Ihr Flowise API Key"
                className="mt-2"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rules">
          <div className="space-y-6">
            {config.responseRules.map((rule, index) => (
              <div key={index} className="flex gap-4 items-start">
                <div className="flex-1 space-y-4">
                  <div>
                    <Label>Pattern</Label>
                    <Input
                      value={rule.pattern}
                      onChange={e => updateRule(index, 'pattern', e.target.value)}
                      placeholder="z.B. enthält 'Kontakt' oder 'E-Mail'"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Typ</Label>
                    <select
                      value={rule.type}
                      onChange={e => updateRule(index, 'type', e.target.value)}
                      className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    >
                      <option value="info">Information</option>
                      <option value="service">Service</option>
                      <option value="link">Link</option>
                      <option value="contact">Kontakt</option>
                      <option value="product">Produkt</option>
                      <option value="location">Standort</option>
                      <option value="faq">FAQ</option>
                      <option value="event">Event</option>
                      <option value="download">Download</option>
                      <option value="video">Video</option>
                    </select>
                  </div>

                  {rule.type === 'link' && (
                    <div>
                      <Label>URL</Label>
                      <Input
                        value={rule.metadata?.url || ''}
                        onChange={e => updateRule(index, 'url', e.target.value)}
                        placeholder="https://..."
                        className="mt-2"
                      />
                    </div>
                  )}

                  {(rule.type === 'product' || rule.type === 'event') && (
                    <>
                      <div>
                        <Label>Bild URL</Label>
                        <Input
                          value={rule.metadata?.image || ''}
                          onChange={e => updateRule(index, 'image', e.target.value)}
                          placeholder="https://..."
                          className="mt-2"
                        />
                      </div>
                      {rule.type === 'product' && (
                        <div>
                          <Label>Preis</Label>
                          <Input
                            value={rule.metadata?.price || ''}
                            onChange={e => updateRule(index, 'price', e.target.value)}
                            placeholder="99,00 €"
                            className="mt-2"
                          />
                        </div>
                      )}
                      {rule.type === 'event' && (
                        <div>
                          <Label>Datum</Label>
                          <Input
                            value={rule.metadata?.date || ''}
                            onChange={e => updateRule(index, 'date', e.target.value)}
                            placeholder="01.01.2024"
                            className="mt-2"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {rule.type === 'location' && (
                    <div>
                      <Label>Adresse</Label>
                      <Input
                        value={rule.metadata?.address || ''}
                        onChange={e => updateRule(index, 'address', e.target.value)}
                        placeholder="Musterstraße 1, 12345 Stadt"
                        className="mt-2"
                      />
                    </div>
                  )}

                  {rule.type === 'video' && (
                    <div>
                      <Label>Video URL</Label>
                      <Input
                        value={rule.metadata?.videoUrl || ''}
                        onChange={e => updateRule(index, 'videoUrl', e.target.value)}
                        placeholder="https://..."
                        className="mt-2"
                      />
                    </div>
                  )}

                  {['link', 'product', 'event', 'download'].includes(rule.type) && (
                    <div>
                      <Label>Button Text</Label>
                      <Input
                        value={rule.metadata?.buttonText || ''}
                        onChange={e => updateRule(index, 'buttonText', e.target.value)}
                        placeholder="Mehr erfahren"
                        className="mt-2"
                      />
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  className="mt-8"
                  onClick={() => removeRule(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button onClick={addRule} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Regel hinzufügen
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="buttons">
          <div className="space-y-6">
            {config.defaultButtons.map((button, index) => (
              <div key={index} className="flex gap-4 items-start">
                <div className="flex-1 space-y-4">
                  <div>
                    <Label>Button Text</Label>
                    <Input
                      value={button.text}
                      onChange={e => updateButton(index, 'text', e.target.value)}
                      placeholder="z.B. Kontakt aufnehmen"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>URL</Label>
                    <Input
                      value={button.url}
                      onChange={e => updateButton(index, 'url', e.target.value)}
                      placeholder="https://..."
                      className="mt-2"
                    />
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="mt-8"
                  onClick={() => removeButton(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button onClick={addButton} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Button hinzufügen
            </Button>
          </div>
        </TabsContent>

        <div className="mt-8">
          <Button onClick={saveConfig} className="w-full">
            Konfiguration speichern
          </Button>
        </div>
      </Tabs>
    </>
  )
} 