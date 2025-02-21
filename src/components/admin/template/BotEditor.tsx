'use client'

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Template } from '@/lib/types/template'
import { BotType, FlowiseBotConfig, ExamplesBotConfig, DialogEngineConfig } from '@/lib/types/bot'
import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { FlowiseBot } from './bot/FlowiseBot'
import { ExamplesBot } from './bot/ExamplesBot'
import { Textarea } from "@/components/ui/textarea"

export const BOT_TYPES = [
  { id: 'dialog-engine', label: 'Dialog Engine' },
  { id: 'flowise', label: 'Flowise' },
  { id: 'examples', label: 'Beispiele' }
] as const

export const AI_PROVIDERS = [
  {
    id: 'openai',
    label: 'OpenAI',
    models: [
      'gpt-4-turbo-preview',
      'gpt-4',
      'gpt-4-32k',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k'
    ]
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    models: [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240229',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2'
    ]
  },
  {
    id: 'mistral',
    label: 'Mistral',
    models: [
      'mistral-tiny',
      'mistral-small',
      'mistral-medium',
      'mistral-large'
    ]
  }
] as const

type AIProvider = typeof AI_PROVIDERS[number]['id']
type AIModel = typeof AI_PROVIDERS[number]['models'][number]

interface BotEditorProps {
  type: BotType
  config?: DialogEngineConfig | FlowiseBotConfig | ExamplesBotConfig
  templateId: string
  onTypeChange: (type: BotType) => void
  onConfigChange: (config: DialogEngineConfig | FlowiseBotConfig | ExamplesBotConfig) => void
}

export function BotEditor({ type, config, templateId, onTypeChange, onConfigChange }: BotEditorProps) {
  const defaultConfig: DialogEngineConfig = {
    type: 'dialog-engine',
    active: true,
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    systemPrompt: '',
    matchThreshold: 0.8,
    contextWindow: 1000,
    maxTokens: 500,
    dynamicResponses: true,
    includeLinks: true,
    includeMetadata: true,
    streaming: true,
    fallbackMessage: 'Entschuldigung, ich konnte Ihre Anfrage nicht verarbeiten.',
    maxResponseTime: 30000
  }

  const [botConfig, setBotConfig] = useState<DialogEngineConfig>(
    type === 'dialog-engine' ? (config as DialogEngineConfig || defaultConfig) : defaultConfig
  )
  const [activeTab, setActiveTab] = useState('basic')

  const handleNumberChange = (key: keyof DialogEngineConfig) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value)
    if (!isNaN(value)) {
      const updatedConfig = {
        ...botConfig,
        [key]: value
      }
      setBotConfig(updatedConfig)
      onConfigChange(updatedConfig)
    }
  }

  const handleStringChange = (key: keyof DialogEngineConfig) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const updatedConfig = {
      ...botConfig,
      [key]: event.target.value
    }
    setBotConfig(updatedConfig)
    onConfigChange(updatedConfig)
  }

  const handleBooleanChange = (key: keyof DialogEngineConfig, value: boolean) => {
    const updatedConfig = {
      ...botConfig,
      [key]: value
    }
    setBotConfig(updatedConfig)
    onConfigChange(updatedConfig)
  }

  const handleProviderChange = (value: AIProvider) => {
    const provider = AI_PROVIDERS.find(p => p.id === value)
    if (!provider) return
    
    const defaultModel = provider.models[0]
    
    const newConfig = {
      ...botConfig,
      provider: value,
      model: defaultModel
    }
    
    setBotConfig(newConfig)
    onConfigChange(newConfig)
  }

  const handleModelChange = (value: AIModel) => {
    const newConfig = {
      ...botConfig,
      model: value
    }
    
    setBotConfig(newConfig)
    onConfigChange(newConfig)
  }

  const handleSliderChange = (field: keyof DialogEngineConfig) => (value: number[]) => {
    handleNumberChange(field)({ target: { value: value[0].toString() } } as React.ChangeEvent<HTMLInputElement>)
  }

  const handleSwitchChange = (field: keyof DialogEngineConfig) => (checked: boolean) => {
    handleBooleanChange(field, checked)
  }

  const handleApiKeyChange = (provider: keyof Required<DialogEngineConfig>['apiKeys'], value: string) => {
    const updatedConfig = {
      ...botConfig,
      apiKeys: {
        ...botConfig.apiKeys,
        [provider]: value
      }
    }
    setBotConfig(updatedConfig)
    onConfigChange(updatedConfig)
  }

  return (
    <div className="space-y-6">
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

      {type === 'dialog-engine' && (
        <Card className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="basic">Grundeinstellungen</TabsTrigger>
              <TabsTrigger value="search">Suche</TabsTrigger>
              <TabsTrigger value="responses">Antworten</TabsTrigger>
              <TabsTrigger value="advanced">Erweitert</TabsTrigger>
              <TabsTrigger value="api">API Keys</TabsTrigger>
            </TabsList>

            <TabsContent value="basic">
              <div className="space-y-4">
                <div>
                  <Label>KI Provider</Label>
                  <Select
                    value={botConfig.provider}
                    onValueChange={handleProviderChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Provider auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_PROVIDERS.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Modell</Label>
                  <Select
                    value={botConfig.model}
                    onValueChange={handleModelChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Modell auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_PROVIDERS.find(p => p.id === botConfig.provider)?.models.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Kreativität (Temperature)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[botConfig.temperature]}
                      onValueChange={handleSliderChange('temperature')}
                      min={0}
                      max={1}
                      step={0.1}
                      className="flex-1"
                    />
                    <span className="w-12 text-sm">{botConfig.temperature}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Niedrig = präzise, Hoch = kreativ
                  </p>
                </div>

                <div>
                  <Label>System Prompt</Label>
                  <Input
                    type="text"
                    value={botConfig.systemPrompt}
                    onChange={handleStringChange('systemPrompt')}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Definiert die Grundpersönlichkeit des Bots
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="search">
              <div className="space-y-4">
                <div>
                  <Label>Übereinstimmungsschwelle</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[botConfig.matchThreshold]}
                      onValueChange={handleSliderChange('matchThreshold')}
                      min={0}
                      max={1}
                      step={0.1}
                      className="flex-1"
                    />
                    <span className="w-12 text-sm">{botConfig.matchThreshold}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Höher = genauere Treffer, Niedriger = mehr Treffer
                  </p>
                </div>

                <div>
                  <Label>Kontextfenster</Label>
                  <Input
                    type="number"
                    value={botConfig.contextWindow}
                    onChange={handleNumberChange('contextWindow')}
                    min={100}
                    max={10000}
                    step={100}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Anzahl der Nachrichten im Kontext
                  </p>
                </div>

                <div>
                  <Label>Maximale Token</Label>
                  <Input
                    type="number"
                    min={1}
                    value={botConfig.maxTokens}
                    onChange={handleNumberChange('maxTokens')}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Maximale Länge der Antwort
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="responses">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Dynamische Antworten</Label>
                    <p className="text-sm text-muted-foreground">
                      Antworten basierend auf Kontext anpassen
                    </p>
                  </div>
                  <Switch
                    checked={botConfig.dynamicResponses}
                    onCheckedChange={handleSwitchChange('dynamicResponses')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Links einbinden</Label>
                    <p className="text-sm text-muted-foreground">
                      Relevante Links in Antworten einfügen
                    </p>
                  </div>
                  <Switch
                    checked={botConfig.includeLinks}
                    onCheckedChange={handleSwitchChange('includeLinks')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Metadaten einbinden</Label>
                    <p className="text-sm text-muted-foreground">
                      Zusätzliche Informationen anzeigen
                    </p>
                  </div>
                  <Switch
                    checked={botConfig.includeMetadata}
                    onCheckedChange={handleSwitchChange('includeMetadata')}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Streaming</Label>
                    <p className="text-sm text-muted-foreground">
                      Antworten live anzeigen
                    </p>
                  </div>
                  <Switch
                    checked={botConfig.streaming}
                    onCheckedChange={handleSwitchChange('streaming')}
                  />
                </div>

                <div>
                  <Label>Ausweichnachricht</Label>
                  <Input
                    value={botConfig.fallbackMessage}
                    onChange={handleStringChange('fallbackMessage')}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Nachricht, wenn keine Antwort gefunden wurde
                  </p>
                </div>

                <div>
                  <Label>Maximale Antwortzeit (Sekunden)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={botConfig.maxResponseTime}
                    onChange={handleNumberChange('maxResponseTime')}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Timeout für Antworten
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="api">
              <div className="space-y-4">
                <div>
                  <Label>OpenAI API Key</Label>
                  <Input
                    type="password"
                    value={botConfig.apiKeys?.openai || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleApiKeyChange('openai', e.target.value)}
                    placeholder="Optional - Standard aus .env wird verwendet"
                  />
                </div>

                <div>
                  <Label>Anthropic API Key</Label>
                  <Input
                    type="password"
                    value={botConfig.apiKeys?.anthropic || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleApiKeyChange('anthropic', e.target.value)}
                    placeholder="Optional - Standard aus .env wird verwendet"
                  />
                </div>

                <div>
                  <Label>Mistral API Key</Label>
                  <Input
                    type="password"
                    value={botConfig.apiKeys?.mistral || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleApiKeyChange('mistral', e.target.value)}
                    placeholder="Optional - Standard aus .env wird verwendet"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      )}

      {type === 'flowise' && (
        <Card className="p-4">
          <FlowiseBot 
            config={config as FlowiseBotConfig} 
            onChange={(newConfig: FlowiseBotConfig) => onConfigChange(newConfig)} 
          />
        </Card>
      )}

      {type === 'examples' && (
        <Card className="p-4">
          <ExamplesBot 
            config={config as ExamplesBotConfig} 
            onChange={(newConfig: ExamplesBotConfig) => onConfigChange(newConfig)} 
          />
        </Card>
      )}
    </div>
  )
} 