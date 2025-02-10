'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Progress } from "@/components/ui/progress"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Plus, Trash2, InfoIcon, Settings2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { useState, useEffect, useCallback } from 'react'
import type { SmartSearchConfig } from "@/lib/types/template"
import { DEFAULT_SMART_SEARCH_CONFIG } from "@/lib/config/smartSearch"
import { DocumentUploader } from '@/components/ui/upload'

interface ScanStatus {
  currentUrl?: string
  pagesScanned: number
  totalPages: number
  contentLength: number
  lastUpdate: Date
}

interface ScanJob {
  jobId: string
  url: string
  status: string
  progress?: {
    completed: number
    total: number
  }
}

interface SmartSearchBotProps {
  config: SmartSearchConfig | undefined
  templateId: string
  onChange: (config: SmartSearchConfig) => void
}

export function SmartSearchBot({ config, templateId, onChange }: SmartSearchBotProps) {
  const [localConfig, setLocalConfig] = useState<SmartSearchConfig>(
    config || DEFAULT_SMART_SEARCH_CONFIG
  )
  const [newUrl, setNewUrl] = useState('')
  const [activeJobs, setActiveJobs] = useState<ScanJob[]>([])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [mode, setMode] = useState<'crawl' | 'upload'>('crawl')

  // Lade aktive Jobs
  const fetchActiveJobs = async () => {
    try {
      const response = await fetch(`/api/scan/jobs?templateId=${templateId}`)
      if (!response.ok) throw new Error('Fehler beim Laden der Jobs')
      const jobs = await response.json()
      setActiveJobs(jobs)
    } catch (error) {
      console.error('Fehler beim Laden der aktiven Jobs:', error)
    }
  }

  useEffect(() => {
    fetchActiveJobs()
    const interval = setInterval(fetchActiveJobs, 5000)
    return () => clearInterval(interval)
  }, [templateId])

  const handleScan = async () => {
    try {
      for (const url of localConfig.urls) {
        const response = await fetch('/api/scan/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, templateId })
        })

        if (!response.ok) {
          throw new Error('Scan konnte nicht gestartet werden')
        }

        const { jobId } = await response.json()
        toast.success(`Scan für ${url} gestartet`)
      }
    } catch (error) {
      console.error('Scan Fehler:', error)
      toast.error('Fehler beim Starten des Scans')
    }
  }

  const addUrl = () => {
    if (!newUrl) return
    
    try {
      new URL(newUrl) // URL-Validierung
      if (!localConfig.urls.includes(newUrl)) {
        const updatedConfig = {
          ...localConfig,
          urls: [...localConfig.urls, newUrl]
        }
        setLocalConfig(updatedConfig)
        onChange(updatedConfig)
        setNewUrl('')
      }
    } catch (error) {
      toast.error('Ungültige URL')
    }
  }

  const removeUrl = (urlToRemove: string) => {
    const updatedConfig = {
      ...localConfig,
      urls: localConfig.urls.filter(url => url !== urlToRemove)
    }
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  return (
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={(value) => setMode(value as 'crawl' | 'upload')}>
        <TabsList>
          <TabsTrigger value="crawl">Website Crawling</TabsTrigger>
          <TabsTrigger value="upload">Dokument-Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="crawl" className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="https://example.com"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addUrl()}
            />
            <Button onClick={addUrl} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {localConfig.urls.length > 0 && (
            <div className="space-y-2">
              {localConfig.urls.map((url) => (
                <div key={url} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="truncate">{url}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeUrl(url)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <Button
                onClick={handleScan}
                disabled={localConfig.urls.length === 0}
              >
                Crawling starten
              </Button>
            </div>
          )}

          {/* Aktive Scans */}
          {activeJobs.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Aktive Scans</h3>
              {activeJobs.map((job) => (
                <div key={job.jobId} className="p-4 border rounded space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium truncate">{job.url}</span>
                    <span className="text-sm text-muted-foreground">
                      {job.status}
                    </span>
                  </div>
                  {job.progress && (
                    <Progress
                      value={(job.progress.completed / job.progress.total) * 100}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Erweiterte Einstellungen */}
          <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex w-full justify-between p-4">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  <span>Erweiterte Einstellungen</span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${isSettingsOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 px-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>
                    Ausschluss-Muster
                    <HoverCard>
                      <HoverCardTrigger>
                        <InfoIcon className="h-4 w-4 inline-block ml-2" />
                      </HoverCardTrigger>
                      <HoverCardContent>
                        Ein Muster pro Zeile, z.B.:
                        <br />/admin/*
                        <br />*.pdf
                        <br />/wp-*
                      </HoverCardContent>
                    </HoverCard>
                  </Label>
                  <Textarea
                    value={localConfig.excludePatterns.join('\n')}
                    onChange={(e) => {
                      const updatedConfig = {
                        ...localConfig,
                        excludePatterns: e.target.value.split('\n').filter(Boolean)
                      }
                      setLocalConfig(updatedConfig)
                      onChange(updatedConfig)
                    }}
                    placeholder="/admin/*&#10;*.pdf&#10;/wp-*"
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Chunk-Größe
                    <HoverCard>
                      <HoverCardTrigger>
                        <InfoIcon className="h-4 w-4 inline-block ml-2" />
                      </HoverCardTrigger>
                      <HoverCardContent>
                        Anzahl der Zeichen pro Chunk (100-1000)
                      </HoverCardContent>
                    </HoverCard>
                  </Label>
                  <Input
                    type="number"
                    min={100}
                    max={1000}
                    value={localConfig.chunkSize}
                    onChange={(e) => {
                      const updatedConfig = {
                        ...localConfig,
                        chunkSize: parseInt(e.target.value)
                      }
                      setLocalConfig(updatedConfig)
                      onChange(updatedConfig)
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Temperatur
                    <HoverCard>
                      <HoverCardTrigger>
                        <InfoIcon className="h-4 w-4 inline-block ml-2" />
                      </HoverCardTrigger>
                      <HoverCardContent>
                        Kreativität der Antworten (0.0-1.0)
                      </HoverCardContent>
                    </HoverCard>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    value={localConfig.temperature}
                    onChange={(e) => {
                      const updatedConfig = {
                        ...localConfig,
                        temperature: parseFloat(e.target.value)
                      }
                      setLocalConfig(updatedConfig)
                      onChange(updatedConfig)
                    }}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </TabsContent>

        <TabsContent value="upload">
          <DocumentUploader templateId={templateId} />
        </TabsContent>
      </Tabs>
    </div>
  )
} 