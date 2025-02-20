'use client'

import { useEffect, useState } from 'react'
import { BotEditor } from '@/components/admin/template/BotEditor'
import { BotType, DialogEngineConfig, FlowiseBotConfig, ExamplesBotConfig, ParsedBot } from '@/lib/types/template'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

interface BotPageProps {
  params: {
    id: string
  }
}

const defaultFlowiseConfig: FlowiseBotConfig = {
  flowId: '',
  apiKey: ''
}

const defaultExamplesConfig: ExamplesBotConfig = {
  examples: []
}

const defaultDialogEngineConfig: DialogEngineConfig = {
  provider: 'openai',
  model: 'gpt-4',
  temperature: 0.7,
  systemPrompt: 'Du bist ein hilfreicher Assistent.',
  matchThreshold: 0.7,
  contextWindow: 1000,
  maxTokens: 500,
  dynamicResponses: true,
  includeLinks: true,
  includeMetadata: true,
  streaming: true,
  fallbackMessage: 'Entschuldigung, ich konnte keine passende Antwort finden.',
  maxResponseTime: 30000
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
      setBot(data || createDefaultBot())
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

  const createDefaultBot = (): ParsedBot => ({
    type: 'dialog-engine',
    config: defaultDialogEngineConfig
  })

  const handleTypeChange = (newType: BotType) => {
    if (!bot) return
    
    let config: DialogEngineConfig | FlowiseBotConfig | ExamplesBotConfig
    switch (newType) {
      case 'dialog-engine':
        config = defaultDialogEngineConfig
        break
      case 'flowise':
        config = defaultFlowiseConfig
        break
      case 'examples':
        config = defaultExamplesConfig
        break
      default:
        config = defaultDialogEngineConfig
    }

    const updatedBot: ParsedBot = {
      type: newType,
      config
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
      body: JSON.stringify(bot),
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
        type={bot.type}
        config={bot.config}
        templateId={params.id}
        onTypeChange={handleTypeChange}
        onConfigChange={(newConfig) => {
          const updatedBot: ParsedBot = {
            type: bot.type,
            config: newConfig
          }
          handleBotChange(updatedBot)
        }}
      />
    </div>
  )
} 