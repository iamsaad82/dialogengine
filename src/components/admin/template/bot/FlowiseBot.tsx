'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FlowiseBotConfig } from "@/lib/types/template"

interface FlowiseBotProps {
  config?: FlowiseBotConfig
  onChange: (config: FlowiseBotConfig) => void
}

export function FlowiseBot({ config, onChange }: FlowiseBotProps) {
  const currentConfig = config || {
    flowId: '',
    apiKey: ''
  }

  const handleChange = (field: keyof FlowiseBotConfig, value: string) => {
    onChange({
      ...currentConfig,
      [field]: value
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flowise Konfiguration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Flow ID</Label>
          <Input
            value={currentConfig.flowId}
            onChange={e => handleChange('flowId', e.target.value)}
            placeholder="ID des Flowise Flows"
          />
        </div>

        <div>
          <Label>API Key</Label>
          <Input
            value={currentConfig.apiKey}
            onChange={e => handleChange('apiKey', e.target.value)}
            placeholder="Flowise API Key"
            type="password"
          />
        </div>
      </CardContent>
    </Card>
  )
} 