import React from 'react'
import { ParsedBranding } from '@/lib/types/template'
import { Brain, Clock, Download, HelpCircle, Info, Link, MapPin, Phone, Play, ShoppingBag, Calendar, Heart, Shield, Mail, Globe } from 'lucide-react'
import { ReactElement } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string | ReactElement
}

interface MessageBubbleProps {
  message: Message
  branding: ParsedBranding | null
}

export function MessageBubble({ message, branding }: MessageBubbleProps) {
  const isBot = message.role === 'assistant'

  const parseMessageContent = (content: string | ReactElement): {
    type?: string,
    title?: string,
    text?: string,
    metadata?: any
  } => {
    if (typeof content === 'string') {
      try {
        return JSON.parse(content)
      } catch {
        return { text: content }
      }
    } else if (typeof content === 'object' && content !== null) {
      return content as any
    }
    return { text: 'Complex content' }
  }

  const renderIcon = (type?: string) => {
    const iconProps = { className: 'w-5 h-5', strokeWidth: 1.5 }
    switch (type?.toLowerCase()) {
      case 'info':
        return <Info {...iconProps} />
      case 'service':
        return <Brain {...iconProps} />
      case 'product':
        return <ShoppingBag {...iconProps} />
      case 'event':
        return <Calendar {...iconProps} />
      case 'location':
        return <MapPin {...iconProps} />
      case 'video':
        return <Play {...iconProps} />
      case 'link':
        return <Link {...iconProps} />
      case 'contact':
        return <Phone {...iconProps} />
      case 'download':
        return <Download {...iconProps} />
      case 'medical':
        return <Heart {...iconProps} />
      case 'insurance':
        return <Shield {...iconProps} />
      case 'wait':
        return <Clock {...iconProps} className="animate-spin" />
      default:
        return <HelpCircle {...iconProps} />
    }
  }

  const renderContent = () => {
    const parsedContent = parseMessageContent(message.content)
    const { type, title, text, metadata } = parsedContent

    return (
      <div className="space-y-2">
        {title && (
          <div className="flex items-center gap-2 font-medium">
            {renderIcon(type)}
            <span>{title}</span>
          </div>
        )}
        
        <div className="space-y-4">
          {text && (
            <div className="whitespace-pre-wrap">
              {text.split('🔹').map((part, index) => (
                index === 0 ? part : <div key={index} className="ml-4">• {part}</div>
              ))}
            </div>
          )}

          {metadata?.regions && metadata.regions.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="font-medium">Verfügbar bei:</div>
              <ul className="list-disc list-inside space-y-1">
                {metadata.regions.map((region: string, index: number) => (
                  <li key={index}>{region}</li>
                ))}
              </ul>
            </div>
          )}

          {metadata?.requirements && metadata.requirements.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="font-medium">Voraussetzungen:</div>
              <ul className="list-disc list-inside space-y-1">
                {metadata.requirements.map((req: string, index: number) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            </div>
          )}

          {metadata?.costs && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="font-medium">Kosteninformationen:</div>
              <div className="space-y-2">
                {metadata.costs.amount !== undefined && metadata.costs.currency && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{metadata.costs.amount} {metadata.costs.currency}</span>
                    {metadata.costs.period && (
                      <span className="text-gray-500">pro {metadata.costs.period}</span>
                    )}
                  </div>
                )}
                {metadata.costs.details && metadata.costs.details.length > 0 && (
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    {metadata.costs.details.map((detail: string, index: number) => (
                      <li key={index}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {metadata?.coverage && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-4">
              <div className="font-medium">Leistungsumfang:</div>
              
              {metadata.coverage.included && metadata.coverage.included.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-green-600 font-medium">Enthaltene Leistungen:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {metadata.coverage.included.map((item: string, index: number) => (
                      <li key={index} className="text-green-600">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {metadata.coverage.excluded && metadata.coverage.excluded.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-red-600 font-medium">Nicht enthaltene Leistungen:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {metadata.coverage.excluded.map((item: string, index: number) => (
                      <li key={index} className="text-red-600">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {metadata.coverage.conditions && metadata.coverage.conditions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Bedingungen:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {metadata.coverage.conditions.map((item: string, index: number) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {metadata?.validity && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="font-medium">Gültigkeit:</div>
              <div className="space-y-1">
                {metadata.validity.startDate && (
                  <div>
                    <span className="font-medium">Beginn:</span> {metadata.validity.startDate}
                  </div>
                )}
                {metadata.validity.endDate && (
                  <div>
                    <span className="font-medium">Ende:</span> {metadata.validity.endDate}
                  </div>
                )}
                {metadata.validity.waitingPeriod && (
                  <div>
                    <span className="font-medium">Wartezeit:</span> {metadata.validity.waitingPeriod}
                  </div>
                )}
                {metadata.validity.repeatable !== undefined && (
                  <div>
                    <span className="font-medium">Wiederholbar:</span> {metadata.validity.repeatable ? 'Ja' : 'Nein'}
                  </div>
                )}
              </div>
            </div>
          )}

          {metadata?.contactPoints && metadata.contactPoints.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="font-medium">Kontaktmöglichkeiten:</div>
              <div className="space-y-3">
                {metadata.contactPoints.map((contact: any, index: number) => (
                  <div key={index} className="flex items-start gap-2">
                    {contact.type === 'phone' && <Phone className="w-4 h-4 mt-1" />}
                    {contact.type === 'email' && <Mail className="w-4 h-4 mt-1" />}
                    {contact.type === 'web' && <Globe className="w-4 h-4 mt-1" />}
                    <div>
                      <div className="font-medium">{contact.value}</div>
                      {contact.description && (
                        <div className="text-sm text-gray-500">{contact.description}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {metadata?.relatedQuestions && metadata.relatedQuestions.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="font-medium">Häufig gestellte Fragen:</div>
              <ul className="list-disc list-inside space-y-1">
                {metadata.relatedQuestions.map((question: string, index: number) => (
                  <li key={index}>{question}</li>
                ))}
              </ul>
            </div>
          )}

          {metadata?.sources && metadata.sources.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="font-medium">Quellen:</div>
              <div className="space-y-2">
                {metadata.sources.map((source: any, index: number) => (
                  <div key={index}>
                    <a 
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {source.title}
                    </a>
                    {source.snippets && source.snippets.map((snippet: any, sIndex: number) => (
                      <div key={sIndex} className="text-sm text-gray-500 mt-1">
                        {snippet.text}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const containerStyle = {
    display: 'flex',
    justifyContent: isBot ? 'flex-start' : 'flex-end',
    marginBottom: '1rem'
  }

  const bubbleStyle = {
    maxWidth: '80%',
    padding: '1rem',
    borderRadius: '0.75rem',
    backgroundColor: isBot ? 'white' : (branding?.primaryColor || '#4F46E5'),
    color: isBot ? '#000000' : '#FFFFFF',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    border: isBot ? '1px solid #E5E7EB' : 'none'
  }

  return (
    <div style={containerStyle}>
      <div style={bubbleStyle}>
        {renderContent()}
      </div>
    </div>
  )
} 