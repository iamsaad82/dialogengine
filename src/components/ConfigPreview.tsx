"use client"

import React from 'react'
import { ResponseConfig } from '@/config/responseConfig'
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

interface ConfigPreviewProps {
  config: ResponseConfig
  sampleText?: string
}

export default function ConfigPreview({ config, sampleText }: ConfigPreviewProps) {
  // Beispieltext basierend auf dem Typ
  const getDefaultSampleText = () => {
    switch (config.contentType) {
      case 'list':
        return `😊 Hier sind unsere Leistungen im Bereich ${config.type}:\n\n` +
               `**Wichtige Informationen**\n` +
               `- Erster Listenpunkt zum Thema ${config.type}\n` +
               `- Zweiter wichtiger Punkt\n` +
               `- Dritter Punkt mit Details\n\n` +
               `**Weitere Details**\n` +
               `- Noch ein wichtiger Aspekt\n` +
               `- Abschließende Information`
      case 'paragraph':
        return `Wir bieten umfassende Lösungen im Bereich ${config.type}. ` +
               `Unsere Experten unterstützen Sie mit jahrelanger Erfahrung und ` +
               `modernsten Methoden. Lassen Sie uns gemeinsam Ihre Ziele erreichen.`
      case 'table':
        return `**${config.type} Übersicht**\n\n` +
               `| Leistung | Details |\n` +
               `|----------|----------|\n` +
               `| Service 1 | Beschreibung 1 |\n` +
               `| Service 2 | Beschreibung 2 |`
      default:
        return `Informationen zu ${config.type}`
    }
  }

  const text = sampleText || getDefaultSampleText()

  const formatContent = (content: string) => {
    // Helper-Funktion für die Textformatierung
    const formatText = (text: string) => {
      let formattedText = text

      // Ersetze URLs im Format [Text](URL) mit Links
      formattedText = formattedText.replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, (match, label, url) => {
        return `<a href="${url}" class="text-indigo-600 hover:text-indigo-800" target="_blank" rel="noopener noreferrer">${label}</a>`
      })

      // Ersetze URLs im Format [Text](URL) und [Text] mit Links
      formattedText = formattedText.replace(/\[([^\]]+)\](?!\()/g, (match, label) => {
        // Prüfe ob es einen passenden Button in den Actions gibt
        const action = config.actions.find(a => a.label.toLowerCase().includes(label.toLowerCase()))
        if (action) {
          return `<a href="${action.url}" class="text-indigo-600 hover:text-indigo-800" target="_blank" rel="noopener noreferrer">${label}</a>`
        }
        return match
      })

      // Fettgedruckten Text zwischen ** formatieren
      formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

      return formattedText
    }

    if (config.contentType === 'list') {
      const parts = content.split(/\n\n/)
      return (
        <div className="space-y-4">
          {parts.map((part, index) => {
            const lines = part.split('\n')
            const firstLine = lines[0]
            const isHeading = firstLine.includes('**')
            
            return (
              <div key={index}>
                {isHeading && (
                  <h4 className="font-medium text-indigo-600 mb-2">
                    <span 
                      dangerouslySetInnerHTML={{ 
                        __html: formatText(firstLine)
                      }} 
                    />
                  </h4>
                )}
                <div className="space-y-2">
                  {lines.slice(isHeading ? 1 : 0).map((line, lineIndex) => {
                    if (!line.trim()) return null
                    const cleanLine = line.replace(/^[•\-\*]\s*/, '')
                    return (
                      <div key={lineIndex} className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-indigo-500" />
                        <p 
                          className="flex-1 text-gray-900"
                          dangerouslySetInnerHTML={{ 
                            __html: formatText(cleanLine)
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    if (config.contentType === 'table') {
      const lines = content.split('\n')
      const hasHeading = lines[0].includes('**')
      
      return (
        <div className="space-y-4">
          {hasHeading && (
            <h4 className="font-medium text-indigo-600">
              <span 
                dangerouslySetInnerHTML={{ 
                  __html: formatText(lines[0])
                }} 
              />
            </h4>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {lines[hasHeading ? 1 : 0].split('|').filter(Boolean).map((header, i) => (
                    <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <span 
                        dangerouslySetInnerHTML={{ 
                          __html: formatText(header.trim())
                        }} 
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lines.slice(hasHeading ? 4 : 3).map((line, i) => (
                  <tr key={i}>
                    {line.split('|').filter(Boolean).map((cell, j) => (
                      <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span 
                          dangerouslySetInnerHTML={{ 
                            __html: formatText(cell.trim())
                          }} 
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    // Standard-Paragraph mit Link-Erkennung
    return (
      <div className="text-gray-900 space-y-4">
        {text.split('\n').map((paragraph, index) => (
          paragraph.trim() && (
            <p 
              key={index}
              className="text-gray-900"
              dangerouslySetInnerHTML={{ 
                __html: formatText(paragraph)
              }}
            />
          )
        ))}
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h3 className="font-medium text-gray-900 mb-4">Vorschau</h3>
      
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="prose prose-slate max-w-none text-gray-900">
          {formatContent(text)}
        </div>

        {/* Buttons nur anzeigen, wenn sie nicht schon als Links im Text vorkommen */}
        {config.actions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {config.actions
              .filter(action => !text.toLowerCase().includes(action.label.toLowerCase()))
              .map((action, index) => (
                <Button
                  key={index}
                  onClick={() => window.open(action.url, '_blank')}
                  className={action.primary 
                    ? "bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200"
                    : "bg-white hover:bg-slate-50 text-slate-600 border border-slate-200"
                  }
                >
                  {action.label}
                  {action.primary && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              ))}
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-500">
        <p>Erkannte Schlüsselwörter: {config.match.join(', ')}</p>
        <p>Darstellungstyp: {config.contentType}</p>
      </div>
    </div>
  )
} 