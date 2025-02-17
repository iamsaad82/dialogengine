import { useState } from 'react'
import { HandlerConfig } from '@/lib/types/template'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ContentType, ContentTypeEnum, ContentTypeLabels, ContentTypeDescriptions } from '@/lib/types/contentTypes'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface HandlerFormProps {
  handler?: HandlerConfig
  onSave: (handler: HandlerConfig) => void
  onDelete?: () => void
}

const defaultHandler: HandlerConfig = {
  type: ContentTypeEnum.AOK_SERVICE,
  active: true,
  metadata: {
    keyTopics: [],
    entities: [],
    facts: []
  },
  responses: [],
  settings: {
    matchThreshold: 0.7,
    contextWindow: 3,
    maxTokens: 150,
    dynamicResponses: true,
    includeLinks: true,
    pineconeConfig: {
      environment: process.env.NEXT_PUBLIC_PINECONE_ENVIRONMENT || '',
      index: process.env.NEXT_PUBLIC_PINECONE_INDEX || ''
    }
  }
}

export function HandlerForm({ handler, onSave, onDelete }: HandlerFormProps) {
  const [formData, setFormData] = useState<HandlerConfig>(handler || defaultHandler)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as ContentType
    setFormData(prev => ({
      ...prev,
      type
    }))
  }

  const handleMetadataChange = (field: keyof HandlerConfig['metadata'], value: string) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [field]: value.split(',').map(item => item.trim()).filter(Boolean)
      }
    }))
  }

  const handleSettingChange = (field: keyof HandlerConfig['settings'], value: boolean | number) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value
      }
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Handler-Konfiguration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Basis-Einstellungen */}
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Aktiv</Label>
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, active: checked }))
                  }
                />
              </div>
            </div>

            {/* Pinecone-Konfiguration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Pinecone-Konfiguration</h3>
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="pineconeEnvironment">Environment</Label>
                  <Input
                    id="pineconeEnvironment"
                    value={formData.settings.pineconeConfig?.environment || ''}
                    onChange={(e) => {
                      const environment = e.target.value || process.env.NEXT_PUBLIC_PINECONE_ENVIRONMENT || ''
                      setFormData(prev => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          pineconeConfig: {
                            environment,
                            index: prev.settings.pineconeConfig?.index || process.env.NEXT_PUBLIC_PINECONE_INDEX || ''
                          }
                        }
                      }))
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="pineconeIndex">Index</Label>
                  <Input
                    id="pineconeIndex"
                    value={formData.settings.pineconeConfig?.index || ''}
                    onChange={(e) => {
                      const index = e.target.value || process.env.NEXT_PUBLIC_PINECONE_INDEX || ''
                      setFormData(prev => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          pineconeConfig: {
                            environment: prev.settings.pineconeConfig?.environment || process.env.NEXT_PUBLIC_PINECONE_ENVIRONMENT || '',
                            index
                          }
                        }
                      }))
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Erweiterte Einstellungen */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Erweiterte Einstellungen</h3>
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="matchThreshold">Match-Schwellenwert</Label>
                  <Input
                    id="matchThreshold"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={formData.settings.matchThreshold}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        matchThreshold: parseFloat(e.target.value)
                      }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    value={formData.settings.maxTokens}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        maxTokens: parseInt(e.target.value)
                      }
                    }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          {onDelete && (
            <Button type="button" variant="destructive" onClick={onDelete}>
              Löschen
            </Button>
          )}
          <Button type="submit">Speichern</Button>
        </CardFooter>
      </Card>
    </form>
  )
} 