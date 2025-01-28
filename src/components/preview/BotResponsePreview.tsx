'use client'

import { Example } from "@/lib/schemas/template"
import { Button } from "@/components/ui/button"
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ExternalLink, Download, MessageCircle, MapPin, Calendar, Tag, Info, FileText, Play } from 'lucide-react'

interface BotResponsePreviewProps {
  example: Example
}

export function BotResponsePreview({ example }: BotResponsePreviewProps) {
  const renderMetadata = () => {
    if (!example.metadata) return null

    switch (example.type) {
      case 'info':
        return (
          <div className="mt-4 flex items-center text-sm text-muted-foreground">
            <Info className="w-4 h-4 mr-2" />
            <span>Allgemeine Information</span>
          </div>
        )

      case 'service':
        return (
          <div className="mt-4 space-y-4">
            <div className="flex items-center text-sm text-muted-foreground">
              <FileText className="w-4 h-4 mr-2" />
              <span>Service-Information</span>
            </div>
            {example.metadata.buttonText && (
              <Button className="w-full bg-primary/10 text-primary hover:bg-primary/20">
                {example.metadata.buttonText}
              </Button>
            )}
          </div>
        )

      case 'product':
        return (
          <div className="mt-4 space-y-4">
            {example.metadata.image && (
              <div className="relative aspect-video rounded-lg overflow-hidden">
                <img
                  src={example.metadata.image}
                  alt="Produkt"
                  className="object-cover w-full h-full"
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-muted-foreground">
                <Tag className="w-4 h-4 mr-2" />
                <span>Produkt-Information</span>
              </div>
              {example.metadata.price && (
                <span className="text-lg font-semibold">{example.metadata.price}</span>
              )}
            </div>
            {example.metadata.buttonText && (
              <Button className="w-full bg-primary/10 text-primary hover:bg-primary/20">
                {example.metadata.buttonText}
              </Button>
            )}
          </div>
        )

      case 'event':
        return (
          <div className="mt-4 space-y-4">
            {example.metadata.image && (
              <div className="relative aspect-video rounded-lg overflow-hidden">
                <img
                  src={example.metadata.image}
                  alt="Event"
                  className="object-cover w-full h-full"
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="w-4 h-4 mr-2" />
                {example.metadata.date && (
                  <span>{format(new Date(example.metadata.date), 'PPpp', { locale: de })}</span>
                )}
              </div>
            </div>
            {example.metadata.buttonText && (
              <Button className="w-full bg-primary/10 text-primary hover:bg-primary/20">
                {example.metadata.buttonText}
              </Button>
            )}
          </div>
        )

      case 'location':
        return (
          <div className="mt-4 space-y-4">
            {example.metadata.address && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center text-sm">
                  <MapPin className="w-4 h-4 mr-2 text-primary" />
                  <span>{example.metadata.address}</span>
                </div>
              </div>
            )}
          </div>
        )

      case 'video':
        return (
          <div className="mt-4 space-y-4">
            {example.metadata.videoUrl && (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black/5">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="w-12 h-12 text-primary" />
                </div>
                <iframe
                  src={example.metadata.videoUrl}
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        )

      case 'link':
        return (
          <div className="mt-4">
            {example.metadata.url && (
              <Button className="w-full bg-primary/10 text-primary hover:bg-primary/20">
                <ExternalLink className="w-4 h-4 mr-2" />
                {example.metadata.buttonText || 'Mehr erfahren'}
              </Button>
            )}
          </div>
        )

      case 'contact':
        return (
          <div className="mt-4">
            {example.metadata.url && (
              <Button className="w-full bg-primary/10 text-primary hover:bg-primary/20">
                <MessageCircle className="w-4 h-4 mr-2" />
                {example.metadata.buttonText || 'Kontakt aufnehmen'}
              </Button>
            )}
          </div>
        )

      case 'download':
        return (
          <div className="mt-4">
            {example.metadata.url && (
              <Button className="w-full bg-primary/10 text-primary hover:bg-primary/20">
                <Download className="w-4 h-4 mr-2" />
                {example.metadata.buttonText || 'Download'}
              </Button>
            )}
          </div>
        )

      case 'faq':
        return (
          <div className="mt-4 flex items-center text-sm text-muted-foreground">
            <Info className="w-4 h-4 mr-2" />
            <span>FAQ</span>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start space-x-2">
        <div className="flex-1 space-y-2">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-sm">{example.question}</p>
          </div>
          <div className="bg-primary/5 rounded-lg p-3">
            <div className="prose prose-sm">
              <p>{example.answer}</p>
            </div>
            {renderMetadata()}
          </div>
        </div>
      </div>
    </div>
  )
} 