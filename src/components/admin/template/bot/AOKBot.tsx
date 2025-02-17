'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AOKBotConfig } from "@/lib/types/template"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"

interface AOKBotProps {
  config?: AOKBotConfig
  onChange: (config: AOKBotConfig) => void
}

export function AOKBot({ config, onChange }: AOKBotProps) {
  const currentConfig = config || {
    pineconeApiKey: '',
    pineconeEnvironment: '',
    pineconeIndex: '',
    openaiApiKey: ''
  }

  const handleChange = (field: keyof AOKBotConfig, value: string) => {
    onChange({
      ...currentConfig,
      [field]: value
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AOK Handler Konfiguration</CardTitle>
        <CardDescription>
          Die Standardwerte werden aus den Umgebungsvariablen geladen. 
          Füllen Sie die Felder nur aus, wenn Sie von den Standardwerten abweichen möchten.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Diese Konfiguration ist optional. Wenn keine Werte angegeben werden, 
            werden die Standardwerte aus den Umgebungsvariablen verwendet.
            Die Indexierung der Dokumente erfolgt bereits beim Upload mit den 
            korrekten Einstellungen.
          </AlertDescription>
        </Alert>

        <div>
          <Label>Pinecone API Key (Optional)</Label>
          <Input
            value={currentConfig.pineconeApiKey}
            onChange={e => handleChange('pineconeApiKey', e.target.value)}
            placeholder="Verwendet Standardwert aus Umgebungsvariablen"
            type="password"
          />
        </div>

        <div>
          <Label>Pinecone Environment (Optional)</Label>
          <Input
            value={currentConfig.pineconeEnvironment}
            onChange={e => handleChange('pineconeEnvironment', e.target.value)}
            placeholder="Verwendet Standardwert aus Umgebungsvariablen"
          />
        </div>

        <div>
          <Label>Pinecone Index (Optional)</Label>
          <Input
            value={currentConfig.pineconeIndex}
            onChange={e => handleChange('pineconeIndex', e.target.value)}
            placeholder="Verwendet Standardwert aus Umgebungsvariablen"
          />
        </div>

        <div>
          <Label>OpenAI API Key (Optional)</Label>
          <Input
            value={currentConfig.openaiApiKey}
            onChange={e => handleChange('openaiApiKey', e.target.value)}
            placeholder="Verwendet Standardwert aus Umgebungsvariablen"
            type="password"
          />
        </div>
      </CardContent>
    </Card>
  )
} 