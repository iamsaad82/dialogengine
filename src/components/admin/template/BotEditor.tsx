'use client'

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ParsedBot, SmartSearchConfig } from "@/lib/types/template"
import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { ExamplesBot } from './bot/ExamplesBot'
import { FlowiseBot } from './bot/FlowiseBot'
import { SmartSearchBot } from './bot/SmartSearchBot'

const BOT_TYPES = [
  { value: 'examples', label: 'Beispiel-Antworten' },
  { value: 'flowise', label: 'Flowise AI' },
  { value: 'smart-search', label: 'Smart Search AI' }
]

interface BotEditorProps {
  bot: ParsedBot
  onChange: (bot: ParsedBot) => void
  templateId: string
}

export function BotEditor({ bot: initialBot, onChange, templateId }: BotEditorProps) {
  const [bot, setBot] = useState<ParsedBot>(initialBot)
  const { toast } = useToast()

  const handleTypeChange = (value: string) => {
    if (value === bot.type) return

    const newBot: ParsedBot = {
      type: value as 'examples' | 'flowise' | 'smart-search',
      examples: value === 'examples' ? [] : undefined,
      flowiseId: value === 'flowise' ? '' : undefined,
      smartSearch: value === 'smart-search' ? {
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
        templateId
      } : undefined
    }

    setBot(newBot)
    onChange(newBot)
  }

  const updateBot = (updates: Partial<ParsedBot>) => {
    const updatedBot = { ...bot, ...updates }
    setBot(updatedBot)
    onChange(updatedBot)
  }

  return (
    <div className="space-y-6">
      <div>
        <Label>Bot-Typ</Label>
        <Select value={bot.type} onValueChange={handleTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BOT_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {bot.type === 'examples' && (
        <ExamplesBot
          examples={bot.examples || []}
          onChange={examples => updateBot({ examples })}
        />
      )}

      {bot.type === 'flowise' && (
        <FlowiseBot
          flowiseId={bot.flowiseId || ''}
          onChange={flowiseId => updateBot({ flowiseId })}
        />
      )}

      {bot.type === 'smart-search' && bot.smartSearch && (
        <SmartSearchBot
          config={bot.smartSearch}
          onChange={smartSearch => updateBot({ smartSearch })}
          templateId={templateId}
        />
      )}
    </div>
  )
} 