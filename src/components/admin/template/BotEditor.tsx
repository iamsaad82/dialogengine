'use client'

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ParsedBot, SmartSearchConfig, FlowiseBotConfig, AOKBotConfig } from "@/lib/types/template"
import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { ExamplesBot } from './bot/ExamplesBot'
import { FlowiseBot } from './bot/FlowiseBot'
import { SmartSearchBot } from './bot/SmartSearchBot'
import { AOKBot } from './bot/AOKBot'

export const BOT_TYPES = [
  { id: 'smart-search', label: 'Smart Search' },
  { id: 'flowise', label: 'Flowise' },
  { id: 'aok-handler', label: 'AOK Handler' }
] as const

type BotType = typeof BOT_TYPES[number]['id']
type BotConfig = SmartSearchConfig | FlowiseBotConfig | AOKBotConfig

interface BotEditorProps {
  type: BotType
  config?: BotConfig
  onTypeChange: (type: BotType) => void
  onConfigChange: (config: BotConfig) => void
}

export function BotEditor({ type, config, onTypeChange, onConfigChange }: BotEditorProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Bot Typ</Label>
        <Select value={type} onValueChange={(value) => onTypeChange(value as BotType)}>
          <SelectTrigger>
            <SelectValue placeholder="Wähle einen Bot Typ" />
          </SelectTrigger>
          <SelectContent>
            {BOT_TYPES.map((botType) => (
              <SelectItem key={botType.id} value={botType.id}>
                {botType.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {type === 'smart-search' && (
        <SmartSearchBot
          config={config as SmartSearchConfig}
          onChange={onConfigChange}
        />
      )}

      {type === 'flowise' && (
        <FlowiseBot
          config={config as FlowiseBotConfig}
          onChange={onConfigChange}
        />
      )}

      {type === 'aok-handler' && (
        <AOKBot
          config={config as AOKBotConfig}
          onChange={onConfigChange}
        />
      )}
    </div>
  )
} 