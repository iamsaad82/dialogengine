'use client'

import { Example } from "@/lib/schemas/template"
import { Button } from "@/components/ui/button"
import { CalendarIcon, MapPinIcon, FileIcon, ExternalLinkIcon, PhoneIcon, MessageSquareIcon, User2, Bot } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { useEffect, useRef } from "react"

interface BotResponsePreviewProps {
  example: Example
}

export function BotResponsePreview({ example }: BotResponsePreviewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [example])

  const renderContent = () => {
    const baseClasses = {
      container: "space-y-4 px-4 overflow-y-auto",
      messageGroup: "flex items-start gap-2.5",
      avatar: "w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0",
      userAvatar: "bg-primary",
      botAvatar: "bg-muted-foreground",
      messageContent: "flex flex-col gap-1",
      messageBubble: "px-4 py-2 rounded-2xl max-w-[85%] text-[13px] leading-relaxed",
      userBubble: "bg-primary/10 text-primary rounded-br-sm",
      botBubble: "bg-card shadow-sm rounded-bl-sm",
      mediaSection: "mt-3 -mx-4 first:mt-2",
      buttonSection: "mt-3 space-y-1.5"
    }

    return (
      <div className={baseClasses.container}>
        {/* User Message */}
        <div className={cn(baseClasses.messageGroup, "justify-end")}>
          <div className={baseClasses.messageContent}>
            <div className={cn(baseClasses.messageBubble, baseClasses.userBubble)}>
              {example.question}
            </div>
          </div>
          <div className={cn(baseClasses.avatar, baseClasses.userAvatar)}>
            <User2 className="w-4 h-4" />
          </div>
        </div>

        {/* Bot Response */}
        <div className={baseClasses.messageGroup}>
          <div className={cn(baseClasses.avatar, baseClasses.botAvatar)}>
            <Bot className="w-4 h-4" />
          </div>
          <div className={baseClasses.messageContent}>
            <div className={cn(baseClasses.messageBubble, baseClasses.botBubble)}>
              {/* Text Answer */}
              <div className="prose prose-sm max-w-none [&>p]:text-[13px] [&>p]:leading-relaxed">
                <p>{example.answer}</p>
              </div>

              {/* Media Content */}
              {example.metadata?.image && (
                <div className={baseClasses.mediaSection}>
                  <div className="relative h-40 overflow-hidden rounded-lg">
                    <Image 
                      src={example.metadata.image} 
                      alt={`${example.type} Bild`}
                      fill
                      className="object-cover"
                    />
                    {example.type === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                          <div className="w-0 h-0 border-t-5 border-t-transparent border-l-8 border-l-primary border-b-5 border-b-transparent ml-1" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Info */}
              {(example.type === 'event' || example.type === 'location') && example.metadata?.address && (
                <div className="mt-2 flex items-center text-xs text-muted-foreground">
                  <MapPinIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                  <span>{example.metadata.address}</span>
                </div>
              )}

              {example.type === 'event' && example.metadata?.date && (
                <div className="mt-2 flex items-center text-xs text-muted-foreground">
                  <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                  <span>{new Date(example.metadata.date).toLocaleString('de-DE')}</span>
                </div>
              )}

              {example.type === 'product' && example.metadata?.price && (
                <div className="mt-2 flex items-center text-xs">
                  <span className="text-muted-foreground">Preis:</span>
                  <span className="ml-2 font-medium">{example.metadata.price}</span>
                </div>
              )}

              {/* Action Buttons */}
              {example.metadata?.url && (
                <div className={baseClasses.buttonSection}>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full justify-between bg-primary/5 hover:bg-primary/10 text-xs h-8"
                  >
                    {example.metadata.buttonText || 'Mehr erfahren'}
                    <ExternalLinkIcon className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* FAQ Related Questions */}
              {example.type === 'faq' && example.metadata?.relatedQuestions && (
                <div className={baseClasses.buttonSection}>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Verwandte Fragen:</p>
                  <div className="space-y-1">
                    {example.metadata.relatedQuestions.split('\n').map((question, index) => (
                      <Button 
                        key={index}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-left h-auto py-1.5 px-2.5 text-xs hover:bg-primary/5"
                      >
                        <span className="line-clamp-2">{question}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div ref={messagesEndRef} />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto h-[500px] overflow-y-auto">
      {renderContent()}
    </div>
  )
} 