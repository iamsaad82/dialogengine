'use client'

import React, { useState } from 'react'
import { ParsedBranding } from '@/lib/types/template'
import { Brain, Clock, Download, HelpCircle, Info, Link, MapPin, Phone, Play, ShoppingBag, Calendar, Heart, Shield, Mail, Globe, ChevronLeft, ChevronRight, CheckCircle, Star, Sparkles, Target, ListChecks, Lightbulb, XCircle } from 'lucide-react'
import { ReactElement } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { InteractiveElement } from './InteractiveElement'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'

interface Message {
  role: 'user' | 'assistant'
  content: string | ReactElement
  metadata?: {
    type?: string
    icon?: string
    title?: string
    url?: string
    mainTitle?: string
    subtitle?: string
    primaryCategory?: string
    secondaryCategories?: string[]
    keywords?: string[]
    relatedTopics?: string[]
    interactiveElements?: {
      suggestedQuestions: string[]
      actions: Array<{
        type: 'button' | 'input' | 'suggestion' | 'link' | 'media'
        text: string
        action: string
      }>
      contact: {
        type: 'contact'
        text: string
        action: string
      } | null
    }
  }
}

interface MessageBubbleProps {
  message: Message
  branding: ParsedBranding | null
  onInteraction?: (action: string, value?: string) => void
}

// Neue Interfaces für erweiterte Funktionalität
interface FeedbackElement {
  wasHelpful: boolean
  category: 'accuracy' | 'completeness' | 'clarity'
  comment?: string
}

interface QuickAction {
  label: string
  icon: ReactElement
  action: string
}

interface SmartNavigation {
  title: string
  description: string
  icon: ReactElement
  link: string
}

// Fallback-Branding für den Fall, dass kein Branding definiert ist
const defaultBranding = {
  primaryColor: '#1a1a1a',
  secondaryColor: '#404040',
  backgroundColor: '#ffffff',
  textColor: '#000000'
}

export function MessageBubble({ 
  message, 
  branding, 
  onInteraction 
}: MessageBubbleProps) {
  const isBot = message.role === 'assistant'
  const [showInteractions, setShowInteractions] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [feedback, setFeedback] = useState<FeedbackElement | null>(null)
  const messageRef = React.useRef<HTMLDivElement>(null)

  // Debug log
  console.log('MessageBubble - Message metadata:', {
    metadata: message.metadata,
    keywords: message.metadata?.keywords,
    interactiveElements: message.metadata?.interactiveElements,
    actions: message.metadata?.interactiveElements?.actions
  })

  React.useEffect(() => {
    if (messageRef.current && isBot) {
      const scrollOptions = {
        behavior: 'smooth' as const,
        block: 'nearest' as const
      }
      
      // Verzögere das Scrollen leicht, um Animation zu ermöglichen
      setTimeout(() => {
        messageRef.current?.scrollIntoView(scrollOptions)
      }, 100)
    }
  }, [isBot, message.content])

  // Verwende Branding-Werte oder Fallback
  const activeBranding = branding ? {
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    backgroundColor: branding.backgroundColor,
    textColor: branding.textColor
  } : defaultBranding

  const handleInteraction = (action: string, value?: string) => {
    setShowInteractions(false)
    onInteraction?.(action, value)
  }

  const parseMessageContent = (content: string | ReactElement): {
    text: string | ReactElement
    metadata?: Record<string, any>
  } => {
    if (typeof content !== 'string') {
      return { text: content }
    }

    try {
      const parsed = JSON.parse(content)
      return {
        text: parsed.text || content,
        metadata: parsed.metadata
      }
    } catch {
      return { text: content }
    }
  }

  const renderContent = () => {
    const { text, metadata } = parseMessageContent(message.content)
    
    if (metadata?.type) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {metadata.icon && (
            <div className="mb-2 flex items-center space-x-2">
              {getIcon(metadata.icon)}
              {metadata.title && (
                <span className="font-medium text-lg">{metadata.title}</span>
              )}
            </div>
          )}
          
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {typeof text === 'string' ? (
              <div className="space-y-8">
                {/* Spezielle Formatierung für Identitätsfragen */}
                {message.metadata?.type === 'identity' ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-xl p-6 shadow-sm transition-all duration-300"
                    style={{ 
                      background: `linear-gradient(135deg, ${activeBranding.primaryColor}11, ${activeBranding.primaryColor}08)`,
                    }}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div 
                        className="p-3 rounded-xl"
                        style={{ 
                          background: `linear-gradient(135deg, ${activeBranding.primaryColor}22, ${activeBranding.primaryColor}11)`,
                          color: activeBranding.primaryColor
                        }}
                      >
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-semibold" style={{ color: activeBranding.primaryColor }}>
                        Ihr digitaler AOK-Assistent
                      </h3>
                    </div>
                    <div className="text-gray-700 space-y-4">
                      <ReactMarkdown>{text}</ReactMarkdown>
                    </div>
                  </motion.div>
                ) : (
                  // Normale Formatierung für andere Nachrichten
                  text.split('\n\n').reduce<Array<{
                    type: string
                    order: number
                    content: React.JSX.Element
                  }>>((sections, section) => {
                    // Kernaussage
                    if (section.startsWith('🎯') || section.startsWith('Kernaussage')) {
                      const [title, ...content] = section.split('\n')
                      const cleanTitle = title.replace('🎯', '').trim()
                      sections.push({
                        type: 'kernaussage',
                        order: 0,
                        content: (
                          <motion.div
                            key={`kernaussage`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="rounded-xl p-4 shadow-sm transition-all duration-300"
                            style={{ 
                              background: `linear-gradient(135deg, ${activeBranding.primaryColor}11, ${activeBranding.primaryColor}08)`,
                            }}
                          >
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-3">
                              <div 
                                className="p-2 rounded-lg"
                                style={{ 
                                  background: `linear-gradient(135deg, ${activeBranding.primaryColor}22, ${activeBranding.primaryColor}11)`,
                                  color: activeBranding.primaryColor
                                }}
                              >
                                <Target className="w-5 h-5" />
                              </div>
                              <span style={{ color: activeBranding.primaryColor }}>{cleanTitle}</span>
                            </h3>
                            <div className="text-gray-700">
                              <ReactMarkdown>{content.join('\n')}</ReactMarkdown>
                            </div>
                          </motion.div>
                        )
                      })
                    }

                    // Gut zu wissen
                    if (section.startsWith('💡') || section.startsWith('Gut zu wissen')) {
                      const [title, ...content] = section.split('\n')
                      const cleanTitle = title.replace(/^[💡🔍❓]/, '').trim()
                      sections.push({
                        type: 'gut-zu-wissen',
                        order: 1,
                        content: (
                          <motion.div
                            key={`gut-zu-wissen`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="rounded-lg p-4 shadow-sm transition-all duration-300"
                            style={{ 
                              background: `linear-gradient(135deg, ${activeBranding.primaryColor}11, ${activeBranding.primaryColor}08)`,
                            }}
                          >
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-3">
                              <div 
                                className="p-2 rounded-lg"
                                style={{ 
                                  background: `linear-gradient(135deg, ${activeBranding.primaryColor}22, ${activeBranding.primaryColor}11)`,
                                  color: activeBranding.primaryColor
                                }}
                              >
                                <Lightbulb className="w-5 h-5" />
                              </div>
                              <span style={{ color: activeBranding.primaryColor }}>{cleanTitle}</span>
                            </h3>
                            <div className="space-y-2">
                              {content.map((line, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.1 * i }}
                                >
                                  {line.startsWith('-') ? (
                                    <div className="flex items-start space-x-3 group">
                                      <div 
                                        className="mt-2 h-1.5 w-1.5 rounded-full transition-all duration-300 group-hover:scale-110"
                                        style={{ backgroundColor: activeBranding.primaryColor }}
                                      />
                                      <span className="text-gray-700">{line.replace(/^-\s*/, '')}</span>
                                    </div>
                                  ) : (
                                    <p className="text-gray-700">{line}</p>
                                  )}
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )
                      })
                    }

                    // Leistungen
                    if (section.startsWith('📋') || section.startsWith('Leistungen')) {
                      const [title, ...content] = section.split('\n')
                      const cleanTitle = title.replace('📋', '').trim()
                      sections.push({
                        type: 'leistungen',
                        order: 2,
                        content: (
                          <motion.div
                            key={`leistungen`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="relative mt-6 mb-8"
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <div 
                                className="p-3 rounded-xl"
                                style={{ 
                                  background: `linear-gradient(135deg, ${activeBranding.primaryColor}22, ${activeBranding.primaryColor}11)`,
                                  color: activeBranding.primaryColor
                                }}
                              >
                                <ListChecks className="w-5 h-5" />
                              </div>
                              <h3 className="text-lg font-semibold">
                                {cleanTitle}
                              </h3>
                            </div>
                            {renderServiceCards(content, activeBranding, currentSlide, setCurrentSlide)}
                          </motion.div>
                        )
                      })
                    }

                    return sections
                  }, [])
                  .sort((a, b) => a.order - b.order)
                  .map(section => section.content)
                )}
              </div>
            ) : (
              text
          )}
        </div>
        </motion.div>
      )
    }

    return typeof text === 'string' ? (
      <div className="prose prose-sm dark:prose-invert">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    ) : text
  }

  const getIcon = (type: string): ReactElement => {
    const iconProps = { className: "h-5 w-5" }
    
    switch (type.toLowerCase()) {
      case 'info':
        return <Info {...iconProps} />
      case 'help':
        return <HelpCircle {...iconProps} />
      case 'brain':
        return <Brain {...iconProps} />
      case 'clock':
        return <Clock {...iconProps} />
      case 'download':
        return <Download {...iconProps} />
      case 'location':
        return <MapPin {...iconProps} />
      case 'phone':
        return <Phone {...iconProps} />
      case 'video':
        return <Play {...iconProps} />
      case 'service':
        return <ShoppingBag {...iconProps} />
      case 'calendar':
        return <Calendar {...iconProps} />
      case 'health':
        return <Heart {...iconProps} />
      case 'insurance':
        return <Shield {...iconProps} />
      case 'contact':
        return <Mail {...iconProps} />
      case 'website':
        return <Globe {...iconProps} />
      default:
        return <Info {...iconProps} />
    }
  }

  // Neue Render-Funktionen für erweiterte Elemente
  const renderTopicTags = () => {
    if (!message.metadata?.keywords?.length) return null
    
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-2 mb-4"
      >
        {message.metadata.keywords.map((keyword, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * index }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm"
            style={{
              backgroundColor: `${activeBranding.primaryColor}15`,
              color: activeBranding.primaryColor
            }}
          >
            {getIcon(keyword.toLowerCase())}
            <span>{keyword}</span>
          </motion.div>
        ))}
      </motion.div>
    )
  }

  const renderSmartNavigation = () => {
    if (!message.metadata?.relatedTopics?.length) return null

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-6 grid grid-cols-2 gap-4"
      >
        {message.metadata.relatedTopics.map((topic, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * index }}
            className="group cursor-pointer"
            onClick={() => onInteraction?.('navigate', topic)}
          >
            <Card className="h-full bg-white/90 backdrop-blur-sm border-0 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {getIcon(topic.toLowerCase())}
                  <span className="flex-1">{topic}</span>
                </CardTitle>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    )
  }

  const renderFeedback = () => {
    if (feedback || !isBot) return null

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-4 pt-4 border-t border-gray-100"
      >
        <p className="text-sm text-gray-500 mb-2">War diese Antwort hilfreich?</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFeedback({ wasHelpful: true, category: 'accuracy' })}
            className="hover:bg-green-50"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Ja
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFeedback({ wasHelpful: false, category: 'accuracy' })}
            className="hover:bg-red-50"
          >
            <XCircle className="w-4 h-4 mr-1" />
            Nein
          </Button>
        </div>
      </motion.div>
    )
  }

  // Erweiterte Version von renderInteractiveElements
  const renderInteractiveElements = () => {
    const elements = message.metadata?.interactiveElements
    if (!elements || !showInteractions) return null

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-8 space-y-6"
      >
        {/* Topic Tags */}
        {renderTopicTags()}

        {/* Quick Actions */}
        {elements.actions?.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {elements.actions.map((action, index) => (
              <motion.div
                key={`action-${index}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="flex-shrink-0"
              >
                <InteractiveElement
                  type={action.type}
                  text={action.text}
                  action={action.action}
                  branding={activeBranding}
                  onInteraction={handleInteraction}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Smart Navigation */}
        {renderSmartNavigation()}

        {/* Vorgeschlagene Fragen mit verbessertem Layout */}
        {elements.suggestedQuestions?.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-6"
          >
            <h4 className="text-sm font-medium mb-3 text-gray-500 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              <span>Das könnte Sie auch interessieren:</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {elements.suggestedQuestions.map((question, index) => (
                <motion.div
                  key={`question-${index}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2 + index * 0.1 }}
                >
                  <InteractiveElement
                    type="suggestion"
                    text={question}
                    action={question}
                    branding={activeBranding}
                    onInteraction={handleInteraction}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Feedback System */}
        {renderFeedback()}

        {/* Kontakt-Button mit verbessertem Layout */}
        {elements.contact && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="mt-8 flex justify-center"
          >
            <InteractiveElement
              type="button"
              text={elements.contact.text}
              action={elements.contact.action}
              branding={activeBranding}
              onInteraction={handleInteraction}
            />
          </motion.div>
        )}
      </motion.div>
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
    backgroundColor: isBot ? 'white' : (activeBranding.primaryColor || '#4F46E5'),
    color: isBot ? '#000000' : '#FFFFFF',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    border: isBot ? '1px solid #E5E7EB' : 'none'
  }

  return (
    <motion.div
      ref={messageRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "mb-6 flex w-full",
        isBot ? "justify-start" : "justify-end"
      )}
    >
      <div
        className={cn(
          "relative rounded-xl px-6 py-4",
          "max-w-[85%] break-words",
          isBot ? "bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-sm shadow-sm" : "ml-auto"
        )}
        style={{
          backgroundColor: isBot ? undefined : activeBranding.primaryColor,
          color: isBot ? activeBranding.textColor : activeBranding.backgroundColor
        }}
      >
        {isBot && (message.metadata?.mainTitle || message.metadata?.title) && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 border-b border-gray-100 pb-3"
          >
            <div className="flex items-center gap-3">
              {message.metadata.icon && (
                <div 
                  className="p-2 rounded-lg"
                  style={{ 
                    background: `linear-gradient(135deg, ${activeBranding.primaryColor}22, ${activeBranding.primaryColor}11)`,
                    color: activeBranding.primaryColor
                  }}
                >
                  {getIcon(message.metadata.icon)}
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold capitalize" style={{ color: activeBranding.primaryColor }}>
                  {message.metadata.mainTitle || message.metadata.title}
                </h3>
                {(message.metadata.subtitle || message.metadata.type) && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {message.metadata.subtitle || message.metadata.type}
                  </p>
                )}
              </div>
            </div>
            
            {message.metadata.keywords && message.metadata.keywords.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap gap-2 mt-3"
              >
                {message.metadata.keywords.map((keyword, index) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${activeBranding.primaryColor}15`,
                      color: activeBranding.primaryColor
                    }}
                  >
                    {keyword}
                  </motion.span>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
        
        {message.metadata?.icon && !message.metadata?.mainTitle && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 flex items-center space-x-2 text-sm text-gray-500"
          >
            {getIcon(message.metadata.icon)}
            {message.metadata.type && (
              <span>{message.metadata.type}</span>
            )}
          </motion.div>
        )}
        
        <div className="whitespace-pre-wrap">{renderContent()}</div>
        {renderInteractiveElements()}
      </div>
    </motion.div>
  )
}

const formatServiceUrl = (title: string): string => {
  // Mapping von Leistungsbereichen zu URL-Kategorien
  const categoryMap: Record<string, string> = {
    // Vorsorge & Früherkennung
    'vorsorge': 'leistungen/vorsorge',
    'krebsvorsorge': 'leistungen/krebsvorsorge-frueherkennung',
    'früherkennung': 'leistungen/krebsvorsorge-frueherkennung',
    'impfungen': 'leistungen/impfungen',
    'check-up': 'leistungen/vorsorge',
    'gesundheitsuntersuchung': 'leistungen/vorsorge',

    // Behandlungen & Therapien
    'behandlung': 'leistungen/behandlungen-therapien',
    'therapie': 'leistungen/therapien',
    'medizinische behandlung': 'leistungen/medizinische-behandlung',
    'ärztliche behandlung': 'leistungen/medizinische-behandlung',
    'zweitmeinung': 'leistungen/medizinische-behandlung/aerztliche-zweitmeinung',

    // Zahngesundheit
    'zahnvorsorge': 'leistungen/zahngesundheit',
    'zahnbehandlung': 'leistungen/zahngesundheit',
    'zahnersatz': 'leistungen/zahngesundheit',
    'professionelle zahnreinigung': 'leistungen/zahngesundheit',

    // Familie & Schwangerschaft
    'schwangerschaft': 'leistungen/schwangerschaft-familie-kind',
    'familie': 'leistungen/schwangerschaft-familie-kind',
    'kind': 'leistungen/schwangerschaft-familie-kind',
    'mutter-kind': 'leistungen/kuren-reha/mutter-kind-kur-und-vater-kind-kur',
    'vater-kind': 'leistungen/kuren-reha/mutter-kind-kur-und-vater-kind-kur',

    // Alternative Heilmethoden
    'alternativmedizin': 'leistungen/alternative-heilmethoden',
    'homöopathie': 'leistungen/alternative-heilmethoden/homoeopathie',
    'osteopathie': 'leistungen/alternative-heilmethoden/osteopathie',
    'akupunktur': 'leistungen/alternative-heilmethoden/akupunktur',
    'naturheilverfahren': 'leistungen/alternative-heilmethoden',

    // Pflege & Betreuung
    'pflege': 'pflegeleistungen',
    'pflegeberatung': 'pflegeleistungen/pflegeberatung',
    'ambulante pflege': 'pflegeleistungen/ambulante-pflege-zu-hause',
    'pflegeleistungen': 'pflegeleistungen',

    // Hilfsmittel & Medikamente
    'hilfsmittel': 'leistungen/hilfsmittel',
    'arzneimittel': 'leistungen/medizinische-behandlung/arzneimittelleistungen',
    'medikamente': 'leistungen/medizinische-behandlung/arzneimittelleistungen',

    // Kuren & Reha
    'kur': 'leistungen/kuren-reha',
    'reha': 'leistungen/kuren-reha',
    'rehabilitation': 'leistungen/kuren-reha',
    'kinder-reha': 'leistungen/kuren-reha/reha-kinder',

    // Chronische Erkrankungen
    'diabetes': 'leistungen/curaplan-chronische-erkrankungen/diabetes-mellitus',
    'asthma': 'leistungen/curaplan-chronische-erkrankungen/asthma-bronchiale',
    'copd': 'leistungen/curaplan-chronische-erkrankungen/copd',
    'herzkrankheit': 'leistungen/curaplan-chronische-erkrankungen/koronare-herzkrankheit',
    'brustkrebs': 'leistungen/curaplan-chronische-erkrankungen/behandlung-bei-brustkrebs',
    'osteoporose': 'leistungen/curaplan-chronische-erkrankungen/osteoporose'
  }

  // Normalisiere den Titel
  const normalizedTitle = title
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .trim()

  // Suche nach dem passenden Kategorie-Pfad
  for (const [key, path] of Object.entries(categoryMap)) {
    if (normalizedTitle.includes(key.toLowerCase())) {
      return path
    }
  }

  // Fallback: Generische Kategorie
  const fallbackPath = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  
  return `leistungen/${fallbackPath}`
}

const renderServiceCards = (content: string[], branding: any, currentSlide: number, setCurrentSlide: (slide: number) => void) => {
  const items = content.filter(line => line.startsWith('-')).map(line => line.replace(/^-\s*/, ''))
  const itemsPerSlide = 2
  const totalSlides = Math.ceil(items.length / itemsPerSlide)
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="relative mt-4"
    >
      <div className="relative overflow-hidden mx-2 rounded-xl">
        <motion.div 
          className="flex transition-all duration-500 ease-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {Array.from({ length: totalSlides }).map((_, slideIndex) => (
            <div 
              key={slideIndex}
              className="flex-shrink-0 w-full flex gap-6 p-2"
            >
              {items.slice(slideIndex * itemsPerSlide, (slideIndex + 1) * itemsPerSlide).map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="flex-1"
                >
                  <Card 
                    className="group relative h-[180px] bg-white/90 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer"
                    onClick={() => window.open(`https://www.aok.de/pk/${formatServiceUrl(item)}/`, '_blank')}
                  >
                    <CardHeader className="p-4">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <div 
                          className="p-2 rounded-full transition-all duration-300 group-hover:scale-110"
                          style={{ 
                            background: `linear-gradient(135deg, ${branding.primaryColor}22, ${branding.primaryColor}11)`,
                            color: branding.primaryColor
                          }}
                        >
                          <Star className="w-4 h-4" />
                        </div>
                        <span className="flex-1 font-medium">{item}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        Erfahren Sie mehr über die AOK-Leistungen im Bereich {item}.
                      </p>
                    </CardContent>
                    <div 
                      className="absolute inset-x-0 bottom-0 h-12 flex items-center justify-end px-4 bg-gradient-to-t from-white/90 to-transparent"
                    >
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center gap-1 text-sm font-medium"
                        style={{ color: branding.primaryColor }}
                      >
                        Mehr erfahren
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </motion.div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ))}
        </motion.div>

        {/* Navigation Buttons */}
        <AnimatePresence>
          {currentSlide > 0 && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentSlide(currentSlide - 1);
              }}
              style={{ color: branding.primaryColor }}
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
          )}
          
          {currentSlide < totalSlides - 1 && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentSlide(currentSlide + 1);
              }}
              style={{ color: branding.primaryColor }}
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Slide Indicators */}
        {totalSlides > 1 && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <motion.button
                key={index}
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{ 
                  backgroundColor: currentSlide === index 
                    ? branding.primaryColor 
                    : `${branding.primaryColor}44`,
                  transform: currentSlide === index ? 'scale(1.2)' : 'scale(1)'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlide(index);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
} 