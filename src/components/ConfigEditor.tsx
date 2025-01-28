"use client"

import React, { useState, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { createResponseConfig, ResponseConfig, BASE_CONFIG } from '@/config/responseConfig'
import ConfigPreview from './ConfigPreview'

interface ConfigEditorProps {
  onSave: (config: ResponseConfig) => void
}

export default function ConfigEditor({ onSave }: ConfigEditorProps) {
  const [type, setType] = useState('')
  const [keywords, setKeywords] = useState('')
  const [mainUrl, setMainUrl] = useState('')
  const [mainLabel, setMainLabel] = useState('')
  const [additionalUrls, setAdditionalUrls] = useState<Array<{ url: string, label: string }>>([])
  const [contentType, setContentType] = useState('list')
  const [previewText, setPreviewText] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const config = createResponseConfig({
      type,
      keywords: keywords.split(',').map(k => k.trim()),
      mainUrl,
      mainLabel,
      additionalUrls,
      contentType
    })

    onSave(config)
    
    // Formular zurücksetzen
    setType('')
    setKeywords('')
    setMainUrl('')
    setMainLabel('')
    setAdditionalUrls([])
  }

  const addAdditionalUrl = () => {
    setAdditionalUrls([...additionalUrls, { url: '', label: '' }])
  }

  // Generiere die Vorschau-Konfiguration
  const previewConfig = useMemo(() => {
    if (!type || !mainUrl || !mainLabel) return null

    return createResponseConfig({
      type,
      keywords: keywords.split(',').map(k => k.trim()),
      mainUrl,
      mainLabel,
      additionalUrls,
      contentType
    })
  }, [type, keywords, mainUrl, mainLabel, additionalUrls, contentType])

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-6">Neue Antwort-Konfiguration</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formular */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basis-Informationen */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Typ der Antwort
              </label>
              <input
                type="text"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="z.B. social-media, services, etc."
                className="w-full px-3 py-2 border rounded-md text-gray-900 placeholder:text-gray-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schlüsselwörter (kommagetrennt)
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="social media, facebook, instagram"
                className="w-full px-3 py-2 border rounded-md text-gray-900 placeholder:text-gray-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hauptlink-Text
              </label>
              <input
                type="text"
                value={mainLabel}
                onChange={(e) => setMainLabel(e.target.value)}
                placeholder="z.B. 'Mehr über Social Media'"
                className="w-full px-3 py-2 border rounded-md text-gray-900 placeholder:text-gray-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hauptlink-URL
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">{BASE_CONFIG.domain}</span>
                <input
                  type="text"
                  value={mainUrl}
                  onChange={(e) => setMainUrl(e.target.value)}
                  placeholder="/leistungen/social-media/"
                  className="flex-1 px-3 py-2 border rounded-md text-gray-900 placeholder:text-gray-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Darstellungstyp
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-gray-900"
              >
                <option value="list">Liste</option>
                <option value="paragraph">Textabsatz</option>
                <option value="table">Tabelle</option>
              </select>
            </div>
          </div>

          {/* Zusätzliche URLs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Zusätzliche Links</h3>
              <Button
                type="button"
                onClick={addAdditionalUrl}
                className="text-sm bg-indigo-50 text-indigo-600"
              >
                + Link hinzufügen
              </Button>
            </div>

            {additionalUrls.map((url, index) => (
              <div key={index} className="space-y-2 p-4 border rounded-md bg-gray-50">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link-Text
                  </label>
                  <input
                    type="text"
                    value={url.label}
                    onChange={(e) => {
                      const newUrls = [...additionalUrls]
                      newUrls[index].label = e.target.value
                      setAdditionalUrls(newUrls)
                    }}
                    className="w-full px-3 py-2 border rounded-md text-gray-900 placeholder:text-gray-400"
                    placeholder="z.B. 'Kontakt aufnehmen'"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{BASE_CONFIG.domain}</span>
                    <input
                      type="text"
                      value={url.url}
                      onChange={(e) => {
                        const newUrls = [...additionalUrls]
                        newUrls[index].url = e.target.value
                        setAdditionalUrls(newUrls)
                      }}
                      className="flex-1 px-3 py-2 border rounded-md text-gray-900 placeholder:text-gray-400"
                      placeholder="/kontakt/"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        setAdditionalUrls(additionalUrls.filter((_, i) => i !== index))
                      }}
                      className="text-sm bg-red-50 text-red-600"
                    >
                      Entfernen
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Vorschau-Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beispieltext für Vorschau (optional)
            </label>
            <textarea
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Geben Sie einen Beispieltext ein, um zu sehen, wie die Antwort formatiert wird..."
              className="w-full px-3 py-2 border rounded-md h-32 text-gray-900 placeholder:text-gray-400"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Konfiguration speichern
          </Button>
        </form>

        {/* Vorschau */}
        <div className="lg:sticky lg:top-6">
          {previewConfig ? (
            <ConfigPreview 
              config={previewConfig}
              sampleText={previewText || undefined}
            />
          ) : (
            <div className="border rounded-lg p-4 bg-gray-50 text-gray-500 text-center">
              Füllen Sie das Formular aus, um eine Vorschau zu sehen
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 