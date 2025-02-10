'use client'

import { useEffect, useState } from 'react'
import { BotEditor } from '@/components/admin/template/BotEditor'
import { ParsedBot } from '@/lib/types/template'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

interface BotPageProps {
  params: {
    id: string
  }
}

export default function BotPage({ params }: BotPageProps) {
  const [bot, setBot] = useState<ParsedBot | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadBot()
  }, [params.id])

  const loadBot = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/templates/${params.id}/bot`)
      if (!response.ok) throw new Error('Fehler beim Laden')
      const data = await response.json()
      setBot(data.bot || createDefaultBot('examples'))
    } catch (error) {
      console.error('Fehler beim Laden der Bot-Daten:', error)
      toast({
        title: 'Fehler',
        description: 'Die Bot-Daten konnten nicht geladen werden.'
      })
      setBot(createDefaultBot('examples'))
    } finally {
      setLoading(false)
    }
  }

  const createDefaultBot = (type: 'examples' | 'flowise' | 'smart-search'): ParsedBot => {
    return {
      type,
      examples: type === 'examples' ? [] : undefined,
      flowiseId: type === 'flowise' ? '' : undefined,
      smartSearch: type === 'smart-search' ? {
        provider: 'openai',
        urls: [],
        excludePatterns: [],
        chunkSize: 1000,
        temperature: 0.7,
        reindexInterval: 24,
        maxTokensPerRequest: 500,
        maxPages: 100,
        useCache: true,
        similarityThreshold: 0.7,
        apiKey: '',
        indexName: '',
        apiEndpoint: '',
        templateId: params.id
      } : undefined
    }
  }

  const handleBotChange = async (updatedBot: ParsedBot) => {
    try {
      const response = await fetch(`/api/templates/${params.id}/bot`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bot: updatedBot }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Fehler beim Speichern')
      }

      setBot(updatedBot)
      toast({
        title: 'Erfolg',
        description: 'Die Änderungen wurden gespeichert.'
      })
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Die Änderungen konnten nicht gespeichert werden.'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!bot) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Keine Bot-Daten verfügbar. Bitte laden Sie die Seite neu.
      </div>
    )
  }

  return (
    <div>
      <BotEditor 
        bot={bot}
        onChange={handleBotChange}
        templateId={params.id}
      />
    </div>
  )
} 