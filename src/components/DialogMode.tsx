"use client"

import React, { useState, useRef, useEffect, ReactElement } from 'react'
import { Button } from "@/components/ui/button"
import { Bot, Send, User, ArrowRight, ArrowLeft, ExternalLink, Download, MessageCircle, MessageSquareIcon } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { getResponseConfig } from '@/config/responseConfig'
import TypingIndicator from './TypingIndicator'
import { DialogHeadline } from './DialogHeadline'
import { Template, Example, ParsedBot, ParsedContent, ParsedBranding } from '@/lib/types/template'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { CalendarIcon, MapPinIcon, FileIcon } from 'lucide-react'

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
          const example = findDemoAnswer(userMessage)
          await new Promise(resolve => setTimeout(resolve, 1000))
          setIsTyping(false)

          if (example) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: processResponse(example.answer, example.type, example.metadata)
            }])
          } else {
            // Zeige verfügbare Beispielfragen an
            const availableExamples = bot.examples
              .slice(0, 3)
              .map((ex: Example) => `• ${ex.question}`)
              .join('\n');

            setMessages(prev => [...prev, {
              role: 'assistant',
              content: processResponse(`Entschuldigung, für diese spezifische Frage habe ich leider keine passende Antwort. 

Ich kann Ihnen aber bei folgenden Themen weiterhelfen:

${availableExamples}

Sie können auch den klassischen Modus nutzen, um alle Inhalte der Website zu durchsuchen.`, 'info')
            }])
          }
        } else if (bot?.type === 'smart-search') {
          setIsTyping(false);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Smart Search ist derzeit in Entwicklung. Bitte verwenden Sie vorerst die anderen Bot-Typen.'
          }]);
          return;
        } else if (bot?.type === 'flowise' && bot.flowiseId) {
          try {
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
                content: processResponse(data.text || data.answer, data.type || 'info', data.metadata || {})
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
              content: processResponse('Es tut mir leid, es ist ein Fehler aufgetreten. Bitte versuchen Sie es später noch einmal.', 'error', {
                color: branding?.primaryColor || 'var(--primary)'
              })
            }]);
          }
        } else if (bot?.type === 'flowise' && !bot.flowiseId) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          setIsTyping(false);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: processResponse('Der Flowise-Bot wurde noch nicht vollständig konfiguriert. Bitte fügen Sie eine Flowise-ID in den Bot-Einstellungen hinzu.', 'error', {
              color: branding?.primaryColor || 'var(--primary)'
            })
          }]);
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
          setIsTyping(false);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: processResponse('Der Bot-Typ wird nicht unterstützt. Bitte wählen Sie entweder "examples", "smart-search" oder "flowise" als Bot-Typ.', 'error', {
              color: branding?.primaryColor || 'var(--primary)'
            })
          }]);
        }
      } catch (error) {
        console.error('Chat error:', error);
        setIsTyping(false);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: processResponse('Es tut mir leid, es ist ein Fehler aufgetreten. Bitte versuchen Sie es später noch einmal.', 'error', {
            color: branding?.primaryColor || 'var(--primary)'
          })
        }]);
      }
    }

    // Formatiert die Antwort entsprechend unserem Design
    const processResponse = (response: string, type?: string, metadata?: any): ReactElement => {
      const formatText = (text: string, isError?: boolean) => {
        return (
          <div className={cn(
            "text-[15px] leading-relaxed",
            isError && "text-red-600"
          )}
          style={isError ? { color: metadata?.color } : undefined}>
            {text.split('\n').map((line, i) => (
              <p key={i} className="mb-2 last:mb-0">{line}</p>
            ))}
          </div>
        )
      }

      switch (type) {
        case 'error':
          return formatText(response, true)

        case 'info':
          return formatText(response)

        case 'link':
          return (
            <div className="space-y-3">
              {formatText(response)}
              {metadata?.url && (
                <Button 
                  variant="secondary"
                  size="sm"
                  className="inline-flex justify-between bg-primary/5 hover:bg-primary/10 text-xs h-8 px-4"
                  asChild
                >
                  <a href={metadata.url} target="_blank" rel="noopener noreferrer">
                    {metadata.buttonText || 'Mehr erfahren'}
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          )

        case 'contact':
          return (
            <div className="space-y-3">
              {formatText(response)}
              {(metadata?.buttonText || metadata?.url) && (
                <Button 
                  variant="secondary"
                  size="sm"
                  className="inline-flex justify-between bg-primary/5 hover:bg-primary/10 text-xs h-8 px-4"
                  asChild
                >
                  <a href={metadata.url} target="_blank" rel="noopener noreferrer">
                    <div className="flex items-center">
                      <User className="mr-2 h-3.5 w-3.5" />
                      {metadata.buttonText || 'Kontakt aufnehmen'}
                    </div>
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          )

        case 'service':
          return (
            <div className="space-y-3">
              {formatText(response)}
              {metadata?.url && (
                <Button 
                  variant="secondary"
                  size="sm"
                  className="inline-flex justify-between bg-primary/5 hover:bg-primary/10 text-xs h-8 px-4"
                  asChild
                >
                  <a href={metadata.url} target="_blank" rel="noopener noreferrer">
                    {metadata.buttonText || 'Zum Service'}
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          )

        case 'product':
          return (
            <div className="space-y-3">
              {metadata?.image && (
                <div className="relative h-40 -mx-4 first:mt-0">
                  <Image 
                    src={metadata.image} 
                    alt="Produkt Bild"
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
              )}
              {formatText(response)}
              {metadata?.url && (
                <Button 
                  variant="secondary"
                  size="sm"
                  className="inline-flex justify-between bg-primary/5 hover:bg-primary/10 text-xs h-8 px-4"
                  asChild
                >
                  <a href={metadata.url} target="_blank" rel="noopener noreferrer">
                    {metadata.buttonText || 'Mehr erfahren'}
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          )

        case 'event':
          return (
            <div className="space-y-3">
              {formatText(response)}
              <div className="space-y-1.5">
                {metadata?.date && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                    {format(new Date(metadata.date), 'PPP', { locale: de })}
                  </div>
                )}
                {metadata?.address && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <MapPinIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                    {metadata.address}
                  </div>
                )}
              </div>
              {metadata?.url && (
                <Button 
                  variant="secondary"
                  size="sm"
                  className="inline-flex justify-between bg-primary/5 hover:bg-primary/10 text-xs h-8 px-4"
                  asChild
                >
                  <a href={metadata.url} target="_blank" rel="noopener noreferrer">
                    {metadata.buttonText || 'Anmelden'}
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          )

        case 'video':
          return (
            <div className="space-y-3">
              {metadata?.image && (
                <div className="relative h-40 -mx-4 first:mt-0">
                  <Image 
                    src={metadata.image} 
                    alt="Video Vorschau"
                    fill
                    className="object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                      <div className="w-0 h-0 border-t-5 border-t-transparent border-l-8 border-b-5 border-b-transparent ml-1"
                        style={{ borderLeftColor: branding?.primaryColor || 'var(--primary)' }} />
                    </div>
                  </div>
                </div>
              )}
              {formatText(response)}
              {metadata?.videoUrl && (
                <Button 
                  variant="secondary"
                  size="sm"
                  className="inline-flex justify-between bg-primary/5 hover:bg-primary/10 text-xs h-8 px-4"
                  asChild
                >
                  <a href={metadata.videoUrl} target="_blank" rel="noopener noreferrer">
                    {metadata.buttonText || 'Video ansehen'}
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          )

        case 'download':
          return (
            <div className="space-y-3">
              {formatText(response)}
              <div className="flex items-center text-xs text-muted-foreground">
                <FileIcon className="mr-2 h-3.5 w-3.5" />
                <div>
                  {metadata?.fileType && <span>{metadata.fileType}</span>}
                  {metadata?.fileSize && <span className="ml-2">({metadata.fileSize} MB)</span>}
                </div>
              </div>
              {metadata?.url && (
                <Button 
                  variant="secondary"
                  size="sm"
                  className="inline-flex justify-between bg-primary/5 hover:bg-primary/10 text-xs h-8 px-4"
                  asChild
                >
                  <a href={metadata.url} target="_blank" rel="noopener noreferrer">
                    {metadata.buttonText || 'Herunterladen'}
                    <Download className="ml-2 h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          )

        case 'faq':
          return (
            <div className="space-y-3">
              {formatText(response)}
              {metadata?.relatedQuestions && typeof metadata.relatedQuestions === 'string' && metadata.relatedQuestions.length > 1 && (
                <div className="mt-4 space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Verwandte Fragen:
                  </p>
                  <div className="space-y-1">
                    {metadata.relatedQuestions.split('\n')
                      .filter((q: string) => q.trim().length > 0)
                      .map((question: string, index: number) => (
                        <Button 
                          key={index}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-left h-auto py-1.5 px-2.5 text-xs hover:bg-primary/5"
                          onClick={() => setInput(question)}
                        >
                          <MessageCircle 
                            className="mr-2 h-3.5 w-3.5 shrink-0" 
                            style={{ color: branding?.primaryColor || 'var(--primary)' }}
                          />
                          <span className="line-clamp-2">{question}</span>
                        </Button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )

        default:
          return formatText(response)
      }
    }

    const MessageBubble = ({ message, branding }: { message: Message, branding: ParsedBranding | null }) => {
      const isUser = message.role === 'user'
      
      return (
        <div className={cn(
          "flex items-start gap-3 max-w-3xl mx-auto",
          isUser ? "justify-end" : "justify-start"
        )}>
          {!isUser && (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: branding?.primaryColor || 'var(--primary)' }}>
              <Bot className="w-5 h-5" />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <div className={cn(
              "px-6 py-4 rounded-2xl text-[15px] leading-relaxed",
              isUser ? "text-white rounded-br-sm max-w-[420px]" : "bg-white shadow-sm rounded-bl-sm max-w-[480px]"
            )}
            style={isUser ? {
              backgroundColor: branding?.primaryColor || 'var(--primary)'
            } : undefined}>
              {message.content}
            </div>
          </div>
          {isUser && (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: branding?.primaryColor || 'var(--primary)' }}>
              <User className="w-5 h-5" />
            </div>
          )}
        </div>
      )
    }

    if (messages.length === 0) {
      return (
        <div ref={ref} className="fixed inset-0 flex flex-col bg-background pt-16">
          {/* Header - fixiert */}
          <div className="flex-none p-6 pt-8 pb-5 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b z-20">
            <div className="max-w-4xl mx-auto space-y-6">
              <DialogHeadline 
                searchTerm={content?.dialog?.title || content?.hero?.title || "Wie kann ich Ihnen helfen?"}
                description={content?.dialog?.description || content?.hero?.description}
                exampleQuestion={bot?.examples?.[0]?.question || "Stellen Sie mir eine Frage"}
                branding={branding}
              />

              {/* Mode Switcher */}
              <div className="flex justify-center">
                <div className="inline-flex flex-col items-center">
                  <div 
                    onClick={() => onModeChange?.(!isDialogMode)}
                    className="flex items-center gap-3 bg-white rounded-full shadow-lg p-2 cursor-pointer hover:shadow-xl transition-all duration-300 w-auto"
                  >
                    {/* Left side - Classic Mode */}
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300",
                      !isDialogMode ? "border" : "opacity-75"
                    )}
                    style={!isDialogMode ? {
                      backgroundColor: `${branding?.primaryColor || 'var(--primary)'}15`,
                      borderColor: branding?.primaryColor || 'var(--primary)',
                      color: branding?.primaryColor || 'var(--primary)'
                    } : undefined}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <line x1="3" y1="9" x2="21" y2="9"/>
                        <line x1="9" y1="21" x2="9" y2="9"/>
                      </svg>
                      <span className="font-medium text-sm sm:text-base whitespace-nowrap">
                        Klassisch
                      </span>
                    </div>

                    {/* Switch */}
                    <div className="relative w-12 h-6 bg-muted rounded-full cursor-pointer shrink-0">
                      <div className="absolute w-5 h-5 rounded-full shadow-md transition-all duration-300"
                        style={{ 
                          backgroundColor: branding?.primaryColor || 'var(--primary)',
                          left: isDialogMode ? '26px' : '2px',
                          top: '2px'
                        }} />
                    </div>

                    {/* Right side - Dialog Mode */}
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300",
                      isDialogMode ? "border" : "opacity-75"
                    )}
                    style={isDialogMode ? {
                      backgroundColor: `${branding?.primaryColor || 'var(--primary)'}15`,
                      borderColor: branding?.primaryColor || 'var(--primary)',
                      color: branding?.primaryColor || 'var(--primary)'
                    } : undefined}>
                      <MessageSquareIcon className="w-4 h-4" />
                      <span className="font-medium text-sm sm:text-base whitespace-nowrap">
                        Dialog
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
                    Tippen zum Wechseln
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Zentriertes initiales Eingabefeld */}
          <div className="flex-1 flex items-start justify-center px-4 pt-16">
            <motion.form 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              onSubmit={handleSubmit} 
              className="relative w-full max-w-4xl"
            >
              <div className={cn(
                "absolute inset-0 rounded-3xl blur-lg transition-all duration-500",
                isFocused ? "opacity-70 scale-105" : "opacity-0 scale-100"
              )} style={{ 
                background: `linear-gradient(to right, ${branding?.primaryColor || '#005e3f'}20, ${branding?.secondaryColor || branding?.primaryColor || '#004730'}20)` 
              }} />
              
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r rounded-3xl" 
                  style={{ 
                    backgroundImage: `linear-gradient(to right, ${branding?.primaryColor || 'var(--primary)'}0A, ${branding?.secondaryColor || branding?.primaryColor || 'var(--primary)'}0A)`
                  }} 
                />
                <div className={`absolute h-8 w-[2px] top-1/2 -mt-4 transition-all duration-200 left-8 ${
                  input ? 'opacity-0' : 'opacity-100'
                } ${
                  isFocused ? 'animate-pulse' : ''
                }`} 
                  style={{ 
                    backgroundColor: isFocused ? branding?.primaryColor || 'var(--primary)' : '#cbd5e1'
                  }} 
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Was möchten Sie wissen?"
                  className="w-full pl-8 pr-24 py-9 text-lg text-slate-700 bg-white backdrop-blur-sm border-2 rounded-3xl shadow-lg transition-all duration-300 outline-none placeholder:text-slate-400"
                  style={{ 
                    caretColor: branding?.primaryColor || 'var(--primary)',
                    borderColor: isFocused ? branding?.primaryColor || 'var(--primary)' : '#e2e8f0'
                  }}
                  disabled={isTyping}
                />
                <Button
                  type="submit"
                  size="lg"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl h-14 px-6"
                  style={{ 
                    background: `linear-gradient(to right, ${branding?.primaryColor || '#005e3f'}, ${branding?.secondaryColor || branding?.primaryColor || '#004730'})` 
                  }}
                  disabled={!input.trim() || isTyping}
                >
                  <Send className="h-5 w-5 sm:mr-2.5" />
                  <span className="hidden sm:inline text-base">Fragen</span>
                </Button>
              </div>
            </motion.form>
          </div>
        </div>
      )
    }

    return (
      <div ref={ref} className="fixed inset-0 flex flex-col bg-background pt-16">
        {/* Header - fixiert */}
        <div className="flex-none p-6 pt-8 pb-5 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b z-20">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Mode Switcher */}
            <div className="flex justify-center">
              <div className="inline-flex flex-col items-center">
                <div 
                  onClick={() => onModeChange?.(!isDialogMode)}
                  className="flex items-center gap-3 bg-white rounded-full shadow-lg p-2 cursor-pointer hover:shadow-xl transition-all duration-300 w-auto"
                >
                  {/* Left side - Classic Mode */}
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300",
                    !isDialogMode ? "border" : "opacity-75"
                  )}
                  style={!isDialogMode ? {
                    backgroundColor: `${branding?.primaryColor || 'var(--primary)'}15`,
                    borderColor: branding?.primaryColor || 'var(--primary)',
                    color: branding?.primaryColor || 'var(--primary)'
                  } : undefined}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <line x1="3" y1="9" x2="21" y2="9"/>
                      <line x1="9" y1="21" x2="9" y2="9"/>
                    </svg>
                    <span className="font-medium text-sm sm:text-base whitespace-nowrap">
                      Klassisch
                    </span>
                  </div>

                  {/* Switch */}
                  <div className="relative w-12 h-6 bg-muted rounded-full cursor-pointer shrink-0">
                    <div className="absolute w-5 h-5 rounded-full shadow-md transition-all duration-300"
                      style={{ 
                        backgroundColor: branding?.primaryColor || 'var(--primary)',
                        left: isDialogMode ? '26px' : '2px',
                        top: '2px'
                      }} />
                  </div>

                  {/* Right side - Dialog Mode */}
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300",
                    isDialogMode ? "border" : "opacity-75"
                  )}
                  style={isDialogMode ? {
                    backgroundColor: `${branding?.primaryColor || 'var(--primary)'}15`,
                    borderColor: branding?.primaryColor || 'var(--primary)',
                    color: branding?.primaryColor || 'var(--primary)'
                  } : undefined}>
                    <MessageSquareIcon className="w-4 h-4" />
                    <span className="font-medium text-sm sm:text-base whitespace-nowrap">
                      Dialog
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
                  Tippen zum Wechseln
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollbarer Chat-Container mit Padding unten für das fixierte Eingabefeld */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-6 space-y-6 pb-32">
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-4xl mx-auto"
                >
                  <MessageBubble message={message} branding={branding} />
                </motion.div>
              ))}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-4xl mx-auto"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: branding?.primaryColor || 'var(--primary)' }}>
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="px-6 py-4 rounded-2xl bg-white shadow-sm">
                      <TypingIndicator branding={branding} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} className="h-32" />
          </div>
        </div>

        {/* Input Container - fixiert, nur im Chat-Zustand */}
        <div className="absolute inset-x-0 bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 z-20">
          <form onSubmit={handleSubmit} className="relative w-full max-w-4xl mx-auto">
            <div className={cn(
              "absolute inset-0 rounded-3xl blur-lg transition-all duration-500",
              isFocused ? "opacity-70 scale-105" : "opacity-0 scale-100"
            )} style={{ 
              background: `linear-gradient(to right, ${branding?.primaryColor || '#005e3f'}20, ${branding?.secondaryColor || branding?.primaryColor || '#004730'}20)` 
            }} />
            
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r rounded-3xl" 
                style={{ 
                  backgroundImage: `linear-gradient(to right, ${branding?.primaryColor || 'var(--primary)'}0A, ${branding?.secondaryColor || branding?.primaryColor || 'var(--primary)'}0A)`
                }} 
              />
              <div className={`absolute h-7 w-[2px] top-1/2 -mt-3.5 transition-all duration-200 left-8 ${
                input ? 'opacity-0' : 'opacity-100'
              } ${
                isFocused ? 'animate-pulse' : ''
              }`} 
                style={{ 
                  backgroundColor: isFocused ? branding?.primaryColor || 'var(--primary)' : '#cbd5e1'
                }} 
              />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Was möchten Sie wissen?"
                className="w-full pl-8 pr-24 py-6 text-base text-slate-700 bg-white backdrop-blur-sm border-2 rounded-3xl shadow-lg transition-all duration-300 outline-none placeholder:text-slate-400"
                style={{ 
                  caretColor: branding?.primaryColor || 'var(--primary)',
                  borderColor: isFocused ? branding?.primaryColor || 'var(--primary)' : '#e2e8f0'
                }}
                disabled={isTyping}
              />
              <Button
                type="submit"
                size="lg"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl h-12 px-5"
                style={{ 
                  background: `linear-gradient(to right, ${branding?.primaryColor || '#005e3f'}, ${branding?.secondaryColor || branding?.primaryColor || '#004730'})` 
                }}
                disabled={!input.trim() || isTyping}
              >
                <Send className="h-5 w-5 sm:mr-2" />
                <span className="hidden sm:inline">Fragen</span>
              </Button>
            </div>
          </form>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Drücken Sie Enter zum Senden
          </p>
        </div>
      </div>
    )
  }
)

DialogMode.displayName = 'DialogMode'

export default DialogMode 