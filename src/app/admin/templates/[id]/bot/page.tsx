'use client'

import { useEffect, useState } from 'react'
import { BotEditor } from '@/components/admin/template/BotEditor'
import { ParsedBot, SmartSearchConfig, FlowiseBotConfig, AOKBotConfig } from '@/lib/types/template'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

interface BotPageProps {
  params: {
    id: string
  }
}

type BotType = 'smart-search' | 'flowise' | 'aok-handler'

const defaultSmartSearchConfig: SmartSearchConfig = {
  urls: [],
  excludePatterns: [],
  chunkSize: 300,
  temperature: 0.7,
  maxTokens: 1000,
  systemPrompt: 'Du bist ein hilfreicher Assistent.',
  userPrompt: 'Beantworte die folgende Frage basierend auf dem Kontext: {question}\n\nKontext:\n{context}',
  followupPrompt: 'Beantworte die Folgefrage basierend auf dem vorherigen Kontext: {question}',
  pinecone: {
    indexName: '',
    environment: ''
  }
}

const defaultFlowiseConfig: FlowiseBotConfig = {
  flowId: '',
  apiKey: ''
}

const defaultAOKConfig: AOKBotConfig = {
  pineconeApiKey: '',
  pineconeEnvironment: '',
  pineconeIndex: '',
  openaiApiKey: ''
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
      setBot(data.bot || createDefaultBot())
    } catch (error) {
      console.error('Fehler beim Laden der Bot-Daten:', error)
      toast({
        title: 'Fehler',
        description: 'Die Bot-Daten konnten nicht geladen werden.'
      })
      setBot(createDefaultBot())
    } finally {
      setLoading(false)
    }
  }

  const createDefaultBot = (): ParsedBot => {
    return {
      type: 'aok-handler',
      aokHandler: {
        pineconeApiKey: '',
        pineconeEnvironment: '',
        pineconeIndex: '',
        openaiApiKey: ''
      }
    }
  }

  const handleTypeChange = (newType: BotType) => {
    if (!bot) return
    const updatedBot: ParsedBot = {
      ...bot,
      type: newType,
      smartSearch: newType === 'smart-search' ? defaultSmartSearchConfig : undefined,
      flowise: newType === 'flowise' ? defaultFlowiseConfig : undefined,
      aokHandler: newType === 'aok-handler' ? defaultAOKConfig : undefined
    }
    handleBotChange(updatedBot)
  }

  const handleBotChange = async (updatedBot: ParsedBot) => {
    try {
      setBot(updatedBot)
      await saveBotConfig(updatedBot)
      toast({
        title: 'Bot-Konfiguration gespeichert',
        description: 'Die Änderungen wurden erfolgreich gespeichert.'
      })
    } catch (error) {
      console.error('Fehler beim Speichern der Bot-Konfiguration:', error)
      toast({
        title: 'Fehler',
        description: 'Die Bot-Konfiguration konnte nicht gespeichert werden.'
      })
    }
  }

  const saveBotConfig = async (bot: ParsedBot) => {
    const response = await fetch(`/api/templates/${params.id}/bot`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bot }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Fehler beim Speichern')
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
        type={bot.type as BotType}
        config={
          bot.type === 'smart-search' ? bot.smartSearch :
          bot.type === 'flowise' ? bot.flowise :
          bot.type === 'aok-handler' ? bot.aokHandler :
          undefined
        }
        onTypeChange={handleTypeChange}
        onConfigChange={(newConfig: SmartSearchConfig | FlowiseBotConfig | AOKBotConfig) => {
          const updatedBot: ParsedBot = {
            ...bot,
            type: bot.type,
            smartSearch: bot.type === 'smart-search' ? newConfig as SmartSearchConfig : undefined,
            flowise: bot.type === 'flowise' ? newConfig as FlowiseBotConfig : undefined,
            aokHandler: bot.type === 'aok-handler' ? newConfig as AOKBotConfig : undefined
          }
          handleBotChange(updatedBot)
        }}
      />
    </div>
  )
} 