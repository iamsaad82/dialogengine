"use client"

import React, { useState, useRef, useEffect, ReactElement } from 'react'
import { Button } from "@/components/ui/button"
import { Bot, Send, User, ArrowRight, ArrowLeft, ExternalLink, Download, MessageCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { getResponseConfig } from '@/config/responseConfig'
import TypingIndicator from './TypingIndicator'
import { DialogHeadline } from './DialogHeadline'
import { Template, Example, ParsedBot, ParsedContent, ParsedBranding } from '@/lib/types/template'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface Message {
  role: 'user' | 'assistant'
  content: string | ReactElement
}

interface DialogModeProps {
  template: Template;
  isDialogMode?: boolean;
  onModeChange?: (mode: boolean) => void;
}

const DialogMode = React.forwardRef<HTMLDivElement, DialogModeProps>(
  function DialogMode({ template, isDialogMode = false, onModeChange }, ref) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isFocused, setIsFocused] = useState(false)
    const [isTyping, setIsTyping] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [showBackButton, setShowBackButton] = useState(false)
    const [content, setContent] = useState<ParsedContent | null>(null)
    const [bot, setBot] = useState<ParsedBot | null>(null)
    const [branding, setBranding] = useState<ParsedBranding | null>(null)

    React.useEffect(() => {
      if (template) {
        const parsedContent = typeof template.jsonContent === 'string' ? JSON.parse(template.jsonContent) : template.jsonContent;
        const parsedBot = typeof template.jsonBot === 'string' ? JSON.parse(template.jsonBot) : template.jsonBot;
        const parsedBranding = typeof template.jsonBranding === 'string' ? JSON.parse(template.jsonBranding) : template.jsonBranding;

        console.log('DialogMode - Parsed Bot Data:', parsedBot);
        console.log('DialogMode - Bot Examples:', parsedBot?.examples);

        // Set background color when branding is parsed
        if (parsedBranding?.primaryColor) {
          document.documentElement.style.setProperty('--background', `${parsedBranding.primaryColor}1A`);
        }

        setContent(parsedContent);
        setBot(parsedBot);
        setBranding(parsedBranding);
      }
    }, [template]);

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
      scrollToBottom()
    }, [messages])

    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, [])

    useEffect(() => {
      if (messages.length > 0) {
        setShowBackButton(true)
      }
    }, [messages])

    const findDemoAnswer = (question: string): Example | undefined => {
      console.log('DialogMode - Searching for answer to:', question);
      console.log('DialogMode - Available examples:', bot?.examples);
      
      if (!bot?.examples) {
        console.log('DialogMode - No examples found in bot data');
        return undefined;
      }
      
      // Exakte Übereinstimmung
      const exactMatch = bot.examples.find(
        (ex: Example) => ex.question.toLowerCase() === question.toLowerCase()
      );
      if (exactMatch) {
        console.log('DialogMode - Found exact match:', exactMatch);
        return exactMatch;
      }

      // Teilweise Übereinstimmung
      const partialMatch = bot.examples.find(
        (ex: Example) => question.toLowerCase().includes(ex.question.toLowerCase()) ||
             ex.question.toLowerCase().includes(question.toLowerCase())
      );
      console.log('DialogMode - Found partial match:', partialMatch);
      return partialMatch;
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim()) return

      // Nutzer-Nachricht hinzufügen
      const userMessage = input.trim()
      setMessages(prev => [...prev, { role: 'user', content: userMessage }])
      setInput('')
      setIsTyping(true)

      try {
        if (bot?.type === 'examples') {
          // Demo-Modus mit künstlicher Verzögerung
          const demoAnswer = findDemoAnswer(userMessage);
          
          // Künstliche Denkzeit für Demo-Modus
          await new Promise(resolve => setTimeout(resolve, 2000));
          setIsTyping(false);
          
          if (demoAnswer) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: processResponse(demoAnswer.answer, demoAnswer.type, demoAnswer.metadata)
            }]);
          } else {
            // Zeige verfügbare Beispielfragen an
            const availableExamples = bot.examples
              .slice(0, 3)
              .map((ex: Example) => `• ${ex.question}`)
              .join('\n');

            setMessages(prev => [...prev, {
              role: 'assistant',
              content: processResponse(`Entschuldigung, für diese spezifische Frage habe ich leider keine passende Antwort in meiner Demo-Version. 

Dies ist eine eingeschränkte Demonstration mit ausgewählten Beispielen. Sie können zum Beispiel folgende Fragen stellen:

${availableExamples}

Oder wechseln Sie in den klassischen Modus, um alle Inhalte der Website zu durchsuchen.`)
            }]);
          }
        } else if (bot?.type === 'smart-search' && bot.smartSearch) {
          // Smart Search Modus
          try {
            // Künstliche Denkzeit für natürlicheres Verhalten
            await new Promise(resolve => setTimeout(resolve, 1000));

            const response = await fetch(bot.smartSearch.apiEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(bot.smartSearch.apiKey && { 'Authorization': `Bearer ${bot.smartSearch.apiKey}` })
              },
              body: JSON.stringify({
                query: userMessage,
                indexName: bot.smartSearch.indexName,
                history: messages.map(msg => ({
                  role: msg.role,
                  content: typeof msg.content === 'string' ? msg.content : 'Complex content'
                }))
              })
            });

            if (!response.ok) {
              throw new Error('Netzwerk-Antwort war nicht ok');
            }

            const data = await response.json();

            // Weitere künstliche Verzögerung für die Antwortformulierung
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            setIsTyping(false);
            
            if (data.answer) {
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: processResponse(data.answer, data.type, data.metadata)
              }]);
            } else {
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: processResponse('Entschuldigung, ich konnte in den Dokumenten keine passende Antwort finden. Können Sie Ihre Frage anders formulieren?')
              }]);
            }
          } catch (error) {
            console.error('Smart Search error:', error);
            setIsTyping(false);
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: processResponse('Entschuldigung, bei der Suche ist ein Fehler aufgetreten. Bitte versuchen Sie es später noch einmal.')
            }]);
          }
        } else if (bot?.type === 'flowise' && bot.flowiseId) {
          // Flowise-Modus mit künstlicher Verzögerung
          try {
            // Initiale Denkzeit
            await new Promise(resolve => setTimeout(resolve, 1000));

            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                question: userMessage,
                history: messages.map(msg => ({
                  role: msg.role,
                  content: typeof msg.content === 'string' ? msg.content : 'Complex content'
                })),
                flowiseId: bot.flowiseId
              })
            });

            if (!response.ok) {
              throw new Error('Netzwerk-Antwort war nicht ok');
            }

            const data = await response.json();

            // Zusätzliche Verzögerung für die Antwortformulierung
            await new Promise(resolve => setTimeout(resolve, 800));
            
            setIsTyping(false);
            
            if (data.text || data.answer) {
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: processResponse(data.text || data.answer, data.type, data.metadata)
              }]);
            } else {
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: processResponse('Entschuldigung, ich konnte Ihre Frage nicht verstehen. Bitte formulieren Sie sie anders.')
              }]);
            }
          } catch (error) {
            console.error('Flowise error:', error);
            setIsTyping(false);
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: processResponse('Es tut mir leid, es ist ein Fehler aufgetreten. Bitte versuchen Sie es später noch einmal.')
            }]);
          }
        } else if (bot?.type === 'flowise' && !bot.flowiseId) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          setIsTyping(false);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: processResponse('Der Flowise-Bot wurde noch nicht vollständig konfiguriert. Bitte fügen Sie eine Flowise-ID in den Bot-Einstellungen hinzu.')
          }]);
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
          setIsTyping(false);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: processResponse('Der Bot-Typ wird nicht unterstützt. Bitte wählen Sie entweder "examples", "smart-search" oder "flowise" als Bot-Typ.')
          }]);
        }
      } catch (error) {
        console.error('Chat error:', error);
        setIsTyping(false);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: processResponse('Es tut mir leid, es ist ein Fehler aufgetreten. Bitte versuchen Sie es später noch einmal.')
        }]);
      }
    }

    // Formatiert die Antwort entsprechend unserem Design
    const processResponse = (response: string, type?: string, metadata?: any): ReactElement => {
      const formatText = (text: string) => {
        if (!text) return null;
        
        const items = text.split(/(?:\r?\n|\r)/).filter(item => item.trim())
        if (items.length === 0) return null;
        
        const hasEmoji = items[0]?.includes('😊') || items[0]?.includes('🎯') || items[0]?.includes('😕')
        const intro = items[0]
        const rest = items.slice(1)
        
        // Prüfen, ob der Rest des Textes eine Liste ist
        const isList = rest.some(item => item.startsWith('-') || item.startsWith('•'))

        // Formatierung für fetten Text
        const formatBoldText = (text: string) => {
          return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        }

        return (
          <>
            {intro && (
              <p 
                className="text-[17px] leading-[1.5] tracking-[-0.01em]" 
                dangerouslySetInnerHTML={{ __html: formatBoldText(intro) }} 
              />
            )}
            {isList ? (
              <div className="space-y-3 mt-4">
                {rest.map((item, index) => {
                  const cleanItem = item.replace(/^[•\-\*]\s*/, '').trim()
                  if (!cleanItem) return null

                  return (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-1.5 h-1.5 mt-2.5 rounded-full" style={{ backgroundColor: branding?.primaryColor }} />
                      <p 
                        className="flex-1 text-[17px] leading-[1.5] tracking-[-0.01em]" 
                        dangerouslySetInnerHTML={{ __html: formatBoldText(cleanItem) }} 
                      />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {rest.map((item, index) => (
                  <p 
                    key={index} 
                    className="text-[17px] leading-[1.5] tracking-[-0.01em]"
                    dangerouslySetInnerHTML={{ __html: formatBoldText(item) }} 
                  />
                ))}
              </div>
            )}
          </>
        )
      }

      // Template-spezifisches Rendering
      switch (type) {
        case 'event':
          return (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                {metadata?.image && (
                  <div className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden">
                    <img src={metadata.image} alt="Event" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="space-y-3">
                    {metadata?.title && (
                      <h3 className="font-semibold text-lg" style={{ color: branding?.primaryColor }}>
                        {metadata.title}
                      </h3>
                    )}
                    {formatText(response)}
                    {metadata?.date && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        {format(new Date(metadata.date), 'PPpp', { locale: de })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {metadata?.buttonText && (
                <div className="flex justify-end">
                  <Button 
                    className="text-white transition-all hover:opacity-90 px-6"
                    style={{
                      background: `linear-gradient(to right, ${branding?.primaryColor}, ${branding?.secondaryColor || branding?.primaryColor})`
                    }}
                  >
                    {metadata.buttonText}
                  </Button>
                </div>
              )}
            </div>
          )

        case 'product':
          return (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                {metadata?.image && (
                  <div className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden">
                    <img src={metadata.image} alt="Produkt" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="space-y-3">
                    {metadata?.title && (
                      <h3 className="font-semibold text-lg" style={{ color: branding?.primaryColor }}>
                        {metadata.title}
                      </h3>
                    )}
                    {formatText(response)}
                    {metadata?.price && (
                      <p className="text-lg font-semibold" style={{ color: branding?.primaryColor }}>
                        {metadata.price}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {metadata?.buttonText && (
                <div className="flex justify-end">
                  <Button 
                    className="text-white transition-all hover:opacity-90 px-6"
                    style={{
                      background: `linear-gradient(to right, ${branding?.primaryColor}, ${branding?.secondaryColor || branding?.primaryColor})`
                    }}
                  >
                    {metadata.buttonText}
                  </Button>
                </div>
              )}
            </div>
          )

        case 'service':
          return (
            <div className="space-y-6">
              <div className="space-y-4">
                {metadata?.icon && (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${branding?.primaryColor}15` }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: branding?.primaryColor }}>
                      {metadata.icon}
                    </svg>
                  </div>
                )}
                {metadata?.title && (
                  <h3 className="font-semibold text-lg" style={{ color: branding?.primaryColor }}>
                    {metadata.title}
                  </h3>
                )}
                {formatText(response)}
              </div>
              {metadata?.buttonText && (
                <div className="flex justify-end">
                  <Button 
                    className="text-white transition-all hover:opacity-90 px-6"
                    style={{
                      background: `linear-gradient(to right, ${branding?.primaryColor}, ${branding?.secondaryColor || branding?.primaryColor})`
                    }}
                  >
                    {metadata.buttonText}
                  </Button>
                </div>
              )}
            </div>
          )

        case 'location':
          return (
            <div className="space-y-6">
              {metadata?.title && (
                <h3 className="font-semibold text-lg" style={{ color: branding?.primaryColor }}>
                  {metadata.title}
                </h3>
              )}
              {formatText(response)}
              {metadata?.address && (
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: branding?.primaryColor }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <p className="text-sm text-gray-600 flex-1">{metadata.address}</p>
                  </div>
                </div>
              )}
              {metadata?.buttonText && (
                <div className="flex justify-end">
                  <Button 
                    className="text-white transition-all hover:opacity-90 px-6"
                    style={{
                      background: `linear-gradient(to right, ${branding?.primaryColor}, ${branding?.secondaryColor || branding?.primaryColor})`
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {metadata.buttonText}
                  </Button>
                </div>
              )}
            </div>
          )

        case 'video':
          return (
            <div className="space-y-6">
              {metadata?.title && (
                <h3 className="font-semibold text-lg" style={{ color: branding?.primaryColor }}>
                  {metadata.title}
                </h3>
              )}
              {formatText(response)}
              {metadata?.videoUrl && (
                <div className="aspect-video rounded-xl overflow-hidden shadow-lg">
                  <iframe
                    src={metadata.videoUrl}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              )}
              {metadata?.buttonText && (
                <div className="flex justify-end">
                  <Button 
                    className="text-white transition-all hover:opacity-90 px-6"
                    style={{
                      background: `linear-gradient(to right, ${branding?.primaryColor}, ${branding?.secondaryColor || branding?.primaryColor})`
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    {metadata.buttonText}
                  </Button>
                </div>
              )}
            </div>
          )

        case 'link':
          return (
            <div className="space-y-6">
              {metadata?.title && (
                <h3 className="font-semibold text-lg" style={{ color: branding?.primaryColor }}>
                  {metadata.title}
                </h3>
              )}
              {formatText(response)}
              {metadata?.url && (
                <div className="flex justify-end">
                  <Button 
                    className="text-white transition-all hover:opacity-90 px-6"
                    style={{
                      background: `linear-gradient(to right, ${branding?.primaryColor}, ${branding?.secondaryColor || branding?.primaryColor})`
                    }}
                    asChild
                  >
                    <a href={metadata.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {metadata.buttonText || 'Mehr erfahren'}
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )

        case 'download':
          return (
            <div className="space-y-6">
              {metadata?.title && (
                <h3 className="font-semibold text-lg" style={{ color: branding?.primaryColor }}>
                  {metadata.title}
                </h3>
              )}
              {formatText(response)}
              {metadata?.url && (
                <div className="flex justify-end">
                  <Button 
                    className="text-white transition-all hover:opacity-90 px-6"
                    style={{
                      background: `linear-gradient(to right, ${branding?.primaryColor}, ${branding?.secondaryColor || branding?.primaryColor})`
                    }}
                    asChild
                  >
                    <a href={metadata.url} download>
                      <Download className="w-4 h-4 mr-2" />
                      {metadata.buttonText || 'Download'}
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )

        case 'contact':
          return (
            <div className="space-y-6">
              {metadata?.title && (
                <h3 className="font-semibold text-lg" style={{ color: branding?.primaryColor }}>
                  {metadata.title}
                </h3>
              )}
              {formatText(response)}
              {metadata?.url && (
                <div className="flex justify-end">
                  <Button 
                    className="text-white transition-all hover:opacity-90 px-6"
                    style={{
                      background: `linear-gradient(to right, ${branding?.primaryColor}, ${branding?.secondaryColor || branding?.primaryColor})`
                    }}
                    asChild
                  >
                    <a href={metadata.url}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {metadata.buttonText || 'Kontakt aufnehmen'}
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )

        case 'faq':
        case 'info':
        default:
          return (
            <div className="space-y-6">
              {metadata?.title && (
                <h3 className="font-semibold text-lg" style={{ color: branding?.primaryColor }}>
                  {metadata.title}
                </h3>
              )}
              {formatText(response)}
            </div>
          )
      }
    }

    if (messages.length === 0) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto space-y-8"
        >
          <DialogHeadline 
            searchTerm={content?.dialog?.title || content?.hero?.title || "Wie kann ich Ihnen helfen?"}
            description={content?.dialog?.description || content?.hero?.description}
            exampleQuestion={bot?.examples?.[0]?.question || "Stellen Sie mir eine Frage"}
          />

          {/* Mode Switcher */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex flex-col items-center max-w-full">
              <div 
                onClick={() => onModeChange?.(!isDialogMode)}
                className="flex items-center gap-3 bg-white rounded-full shadow-lg p-2 cursor-pointer hover:shadow-xl transition-all duration-300 w-auto"
              >
                {/* Left side - Classic Mode */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${
                  !isDialogMode ? 'bg-opacity-10 border' : 'opacity-75'
                }`} 
                style={{ 
                  backgroundColor: !isDialogMode ? `${branding?.primaryColor}15` : 'transparent',
                  borderColor: !isDialogMode ? branding?.primaryColor : 'transparent'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: branding?.primaryColor }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="3" y1="9" x2="21" y2="9"/>
                    <line x1="9" y1="21" x2="9" y2="9"/>
                  </svg>
                  <span className="font-medium text-sm sm:text-base whitespace-nowrap" style={{ color: !isDialogMode ? branding?.primaryColor : '#666666' }}>
                    Klassisch
                  </span>
                </div>

                {/* Switch */}
                <div className="relative w-12 h-6 bg-gray-200 rounded-full cursor-pointer shrink-0">
                  <div 
                    className="absolute w-5 h-5 rounded-full transition-all duration-300 shadow-md"
                    style={{ 
                      backgroundColor: branding?.primaryColor,
                      left: isDialogMode ? '26px' : '2px',
                      top: '2px'
                    }}
                  />
                </div>

                {/* Right side - Dialog Mode */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${
                  isDialogMode ? 'bg-opacity-10 border' : 'opacity-75'
                }`} 
                style={{ 
                  backgroundColor: isDialogMode ? `${branding?.primaryColor}15` : 'transparent',
                  borderColor: isDialogMode ? branding?.primaryColor : 'transparent'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: branding?.primaryColor }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span className="font-medium text-sm sm:text-base whitespace-nowrap" style={{ color: isDialogMode ? branding?.primaryColor : '#666666' }}>
                    Dialog
                  </span>
                </div>
              </div>

              {/* Helper Text */}
              <p className="mt-2 text-xs sm:text-sm text-gray-600">
                Tippen zum Wechseln
              </p>
            </div>
          </motion.div>
          
          <motion.form 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSubmit} 
            className="relative group"
          >
            <div className={`absolute inset-0 bg-gradient-to-r from-[#005e3f]/10 to-[#004730]/10 rounded-3xl blur-xl transition-opacity duration-500 ${isFocused ? 'opacity-100' : 'opacity-0'}`} />
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#005e3f]/5 to-[#004730]/5 rounded-3xl" />
              <div className={`absolute h-7 w-[2px] top-1/2 -mt-3.5 transition-all duration-200 left-8 ${
                input ? 'opacity-0' : 'opacity-100'
              } ${
                isFocused ? 'bg-[#005e3f] animate-pulse' : 'bg-slate-300'
              }`} />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Was möchten Sie wissen?"
                className="w-full pl-8 pr-20 py-8 sm:py-10 text-lg sm:text-xl text-slate-700 bg-white/80 backdrop-blur-sm border-2 border-slate-200 hover:border-[#005e3f]/20 focus:border-[#005e3f] rounded-3xl shadow-xl transition-all duration-300 outline-none placeholder:text-slate-400"
                style={{ caretColor: '#005e3f' }}
              />
              <Button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-gradient-to-r from-[#005e3f] to-[#004730] hover:from-[#004730] hover:to-[#005e3f] text-white h-12 px-4 rounded-xl shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
              >
                <Send className="h-5 w-5 sm:mr-2" />
                <span className="hidden sm:inline">Fragen</span>
              </Button>
            </div>
          </motion.form>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-sm text-slate-500"
          >
            Drücken Sie Enter zum Senden
          </motion.p>
        </motion.div>
      )
    }

    return (
      <div ref={ref} className="relative min-h-screen">
        {/* Dialog Content */}
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Dialog Headline */}
          {content?.dialog && (
            <DialogHeadline
              searchTerm={content.dialog.title}
              description={content.dialog.description}
              exampleQuestion={bot?.examples?.[0]?.question}
            />
          )}

          {/* Mode Switcher */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex flex-col items-center max-w-full">
              <div 
                onClick={() => onModeChange?.(!isDialogMode)}
                className="flex items-center gap-3 bg-white rounded-full shadow-lg p-2 cursor-pointer hover:shadow-xl transition-all duration-300 w-auto"
              >
                {/* Left side - Classic Mode */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${
                  !isDialogMode ? 'bg-opacity-10 border' : 'opacity-75'
                }`} 
                style={{ 
                  backgroundColor: !isDialogMode ? `${branding?.primaryColor}15` : 'transparent',
                  borderColor: !isDialogMode ? branding?.primaryColor : 'transparent'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: branding?.primaryColor }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="3" y1="9" x2="21" y2="9"/>
                    <line x1="9" y1="21" x2="9" y2="9"/>
                  </svg>
                  <span className="font-medium text-sm sm:text-base whitespace-nowrap" style={{ color: !isDialogMode ? branding?.primaryColor : '#666666' }}>
                    Klassisch
                  </span>
                </div>

                {/* Switch */}
                <div className="relative w-12 h-6 bg-gray-200 rounded-full cursor-pointer shrink-0">
                  <div 
                    className="absolute w-5 h-5 rounded-full transition-all duration-300 shadow-md"
                    style={{ 
                      backgroundColor: branding?.primaryColor,
                      left: isDialogMode ? '26px' : '2px',
                      top: '2px'
                    }}
                  />
                </div>

                {/* Right side - Dialog Mode */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${
                  isDialogMode ? 'bg-opacity-10 border' : 'opacity-75'
                }`} 
                style={{ 
                  backgroundColor: isDialogMode ? `${branding?.primaryColor}15` : 'transparent',
                  borderColor: isDialogMode ? branding?.primaryColor : 'transparent'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: branding?.primaryColor }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span className="font-medium text-sm sm:text-base whitespace-nowrap" style={{ color: isDialogMode ? branding?.primaryColor : '#666666' }}>
                    Dialog
                  </span>
                </div>
              </div>

              {/* Helper Text */}
              <p className="mt-2 text-xs sm:text-sm text-gray-600">
                Tippen zum Wechseln
              </p>
            </div>
          </motion.div>

          {/* Messages */}
          <div className="space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ 
                    duration: 0.2,
                    type: "spring",
                    stiffness: 500,
                    damping: 30
                  }}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.2 }}
                    className={`flex items-start gap-3 max-w-[85%] ${
                      message.role === 'user' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`p-2 rounded-full shadow-sm flex-shrink-0 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r'
                          : 'bg-white border border-slate-100'
                      }`}
                      style={
                        message.role === 'user' 
                          ? {
                              background: `linear-gradient(to right, ${branding?.primaryColor}, ${branding?.secondaryColor || branding?.primaryColor})`
                            }
                          : {}
                      }
                    >
                      {message.role === 'user' ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4" style={{ color: branding?.primaryColor }} />
                      )}
                    </motion.div>
                    <motion.div
                      initial={{ x: message.role === 'user' ? 20 : -20 }}
                      animate={{ x: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className={`py-3 px-4 rounded-2xl shadow-sm backdrop-blur-sm ${
                        message.role === 'user'
                          ? 'text-white'
                          : 'bg-white/95 border border-slate-100 text-slate-700'
                      }`}
                      style={
                        message.role === 'user' 
                          ? {
                              background: `linear-gradient(to right, ${branding?.primaryColor}, ${branding?.secondaryColor || branding?.primaryColor})`
                            }
                          : {}
                      }
                    >
                      {message.content}
                    </motion.div>
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing Indicator */}
            <AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ 
                    duration: 0.2,
                    type: "spring",
                    stiffness: 500,
                    damping: 30
                  }}
                  className="flex justify-start"
                >
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.2 }}
                    className="flex items-start gap-3 max-w-[85%]"
                  >
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        repeatType: "reverse"
                      }}
                      className="p-2 rounded-full bg-white border border-slate-100 shadow-sm"
                    >
                      <Bot className="w-4 h-4" style={{ color: branding?.primaryColor }} />
                    </motion.div>
                    <motion.div
                      initial={{ x: -20 }}
                      animate={{ x: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="py-3 px-4 rounded-2xl bg-white/95 border border-slate-100 shadow-sm backdrop-blur-sm"
                    >
                      <TypingIndicator />
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-0 left-0 right-0 p-4"
            style={{ 
              background: `linear-gradient(to top, ${branding?.primaryColor}1A, transparent)`
            }}
          >
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
              <div 
                className={`absolute inset-0 rounded-xl sm:rounded-2xl blur-lg transition-all duration-500 ${
                  isFocused ? 'opacity-70 scale-105' : 'opacity-0 scale-100'
                }`}
                style={{
                  background: `linear-gradient(to right, ${branding?.primaryColor}20, ${branding?.secondaryColor || branding?.primaryColor}20)`
                }}
              />
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Stellen Sie Ihre Frage..."
                  className={`w-full pl-4 sm:pl-6 pr-12 sm:pr-16 py-3 sm:py-4 text-sm sm:text-base text-slate-700 bg-white/80 backdrop-blur-sm border-2 rounded-xl sm:rounded-2xl shadow-lg transition-all duration-300 outline-none placeholder:text-slate-400 ${
                    isFocused 
                      ? 'border-primary' 
                      : 'border-slate-200 hover:border-primary/20'
                  }`}
                  style={{ 
                    caretColor: branding?.primaryColor,
                    '--primary': branding?.primaryColor
                  } as React.CSSProperties}
                />
                <Button 
                  type="submit"
                  className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 text-white h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
                  style={{
                    background: `linear-gradient(to right, ${branding?.primaryColor}, ${branding?.secondaryColor || branding?.primaryColor})`,
                    backgroundImage: `linear-gradient(to right, ${branding?.primaryColor}, ${branding?.secondaryColor || branding?.primaryColor})`
                  }}
                >
                  <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </form>
          </motion.div>

          {/* Bottom Spacing for Fixed Input */}
          <div className="h-32" />
        </div>
      </div>
    )
  }
)

DialogMode.displayName = 'DialogMode'

export default DialogMode 