"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Send, MessageSquareIcon } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { DialogHeadline } from '../DialogHeadline'
import { Template, ParsedBot, ParsedBranding, ParsedContent } from '@/lib/types/template'
import { cn } from '@/lib/utils'
import { Message } from './types'
import { MessageBubble } from './MessageBubble'
import { handleExamplesMode } from './handlers/ExamplesHandler'
import { handleSmartSearchMode } from './handlers/SmartSearchHandler'
import { handleFlowiseMode } from './handlers/FlowiseHandler'
import { handleAOKMode } from './handlers/AOKHandler'
import TypingIndicator from '../TypingIndicator'

interface DialogModeProps {
  template: Template
  isDialogMode?: boolean
  onModeChange?: (mode: boolean) => void
}

const DialogMode = React.forwardRef<HTMLDivElement, DialogModeProps>(
  function DialogMode({ template, isDialogMode = false, onModeChange }, ref) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const [content, setContent] = useState<ParsedContent | null>(null)
    const [bot, setBot] = useState<ParsedBot | null>(null)
    const [branding, setBranding] = useState<ParsedBranding | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      if (template) {
        const parsedContent = typeof template.jsonContent === 'string' ? JSON.parse(template.jsonContent) : template.jsonContent
        const parsedBot = typeof template.jsonBot === 'string' ? JSON.parse(template.jsonBot) : template.jsonBot
        const parsedBranding = typeof template.jsonBranding === 'string' ? JSON.parse(template.jsonBranding) : template.jsonBranding

        setContent(parsedContent)
        setBot(parsedBot)
        setBranding(parsedBranding)
      }
    }, [template])

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

    const logChatInteraction = async (question: string, wasAnswered: boolean, answer?: string, matchedExampleId?: string) => {
      try {
        if (!template?.id) {
          console.error('Template ID fehlt')
          return
        }

        const response = await fetch('/api/analytics/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            timestamp: new Date(),
            question,
            answer,
            wasAnswered,
            matchedExampleId,
            templateId: template.id,
            sessionId: Math.random().toString(36).substring(7)
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('Analytics logging failed:', errorData)
        }
      } catch (error) {
        console.error('Analytics logging failed:', error)
      }
    }

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim() || isTyping) return

      const userMessage = input.trim()
      setMessages(prev => [...prev, { role: 'user', content: userMessage }])
      setInput('')
      setIsTyping(true)

      try {
        let response: Message

        if (bot?.type === 'examples') {
          response = await handleExamplesMode(userMessage, bot, logChatInteraction)
        } else if (bot?.type === 'smart-search') {
          response = await handleSmartSearchMode(userMessage, messages, template, logChatInteraction)
        } else if (bot?.type === 'flowise') {
          response = await handleFlowiseMode(userMessage, messages, template, bot, branding, logChatInteraction)
        } else if (bot?.type === 'aok-handler') {
          response = await handleAOKMode(userMessage, messages, template, bot, branding, logChatInteraction)
        } else {
          response = {
            role: 'assistant',
            content: JSON.stringify({
              type: 'error',
              title: 'Nicht unterstützter Bot-Typ',
              text: 'Der Bot-Typ wird nicht unterstützt. Bitte wählen Sie entweder "examples", "smart-search", "flowise" oder "aok-handler" als Bot-Typ.',
              metadata: {
                color: branding?.primaryColor || 'var(--primary)'
              }
            })
          }
        }

        setMessages(prev => [...prev, response])
      } catch (error) {
        console.error('Chat error:', error)
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: JSON.stringify({
            type: 'error',
            title: 'Technischer Fehler',
            text: 'Es tut mir leid, es ist ein Fehler aufgetreten. Bitte versuchen Sie es später noch einmal.',
            metadata: {
              color: branding?.primaryColor || 'var(--primary)'
            }
          })
        }])
      } finally {
        setIsTyping(false)
      }
    }

    if (messages.length === 0) {
      return (
        <div ref={ref} className="fixed inset-0 flex flex-col bg-background pt-16">
          {/* Header */}
          <div className="flex-none p-6 pt-8 pb-5 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b z-20">
            <div className="max-w-4xl mx-auto space-y-6">
              <DialogHeadline 
                searchTerm={content?.dialog?.title || content?.hero?.title || "Wie kann ich Ihnen helfen?"}
                description={content?.dialog?.description || content?.hero?.description}
                exampleQuestion={bot?.examples?.[0]?.question || "Stellen Sie mir eine Frage"}
                branding={branding}
              />

              {/* Mode Switcher */}
              <ModeSwitcher 
                isDialogMode={isDialogMode} 
                onModeChange={onModeChange}
                branding={branding}
              />
            </div>
          </div>

          {/* Initial Input */}
          <div className="flex-1 flex items-start justify-center px-4 pt-16">
            <ChatInput
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              isFocused={isFocused}
              setIsFocused={setIsFocused}
              isTyping={isTyping}
              inputRef={inputRef}
              branding={branding}
            />
          </div>
        </div>
      )
    }

    return (
      <div ref={ref} className="fixed inset-0 flex flex-col bg-background pt-16">
        {/* Header */}
        <div className="flex-none p-6 pt-8 pb-5 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b z-20">
          <div className="max-w-4xl mx-auto">
            <ModeSwitcher 
              isDialogMode={isDialogMode} 
              onModeChange={onModeChange}
              branding={branding}
            />
          </div>
        </div>

        {/* Chat Messages */}
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
                  <TypingIndicator branding={branding} />
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} className="h-32" />
          </div>
        </div>

        {/* Input Container */}
        <div className="absolute inset-x-0 bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 z-20">
          <div className="max-w-4xl mx-auto">
            <ChatInput
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              isFocused={isFocused}
              setIsFocused={setIsFocused}
              isTyping={isTyping}
              inputRef={inputRef}
              branding={branding}
            />
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Drücken Sie Enter zum Senden
            </p>
          </div>
        </div>
      </div>
    )
  }
)

interface ModeSwitcherProps {
  isDialogMode: boolean
  onModeChange?: (mode: boolean) => void
  branding: ParsedBranding | null
}

const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ isDialogMode, onModeChange, branding }) => {
  return (
    <div className="flex justify-center">
      <div className="inline-flex flex-col items-center">
        <div 
          onClick={() => onModeChange?.(!isDialogMode)}
          className="flex items-center gap-3 bg-white rounded-full shadow-lg p-2 cursor-pointer hover:shadow-xl transition-all duration-300 w-auto"
        >
          {/* Classic Mode */}
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

          {/* Dialog Mode */}
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
  )
}

interface ChatInputProps {
  input: string
  setInput: (input: string) => void
  handleSubmit: (e: React.FormEvent) => void
  isFocused: boolean
  setIsFocused: (focused: boolean) => void
  isTyping: boolean
  inputRef: React.MutableRefObject<HTMLInputElement | null>
  branding: ParsedBranding | null
}

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  handleSubmit,
  isFocused,
  setIsFocused,
  isTyping,
  inputRef,
  branding
}) => {
  return (
    <form onSubmit={handleSubmit} className="relative w-full">
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
  )
}

DialogMode.displayName = 'DialogMode'

export default DialogMode 