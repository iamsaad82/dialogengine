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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

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
  config?: SmartSearchConfig
  onChange: (config: SmartSearchConfig) => void
  templateId?: string
}

export function SmartSearchBot({ templateId, config, onChange }: SmartSearchBotProps) {
  const [localConfig, setLocalConfig] = useState<SmartSearchConfig>(() => {
    const defaultConfig = DEFAULT_SMART_SEARCH_CONFIG
    if (config) {
      return {
        ...defaultConfig,
        ...config,
        pinecone: {
          ...defaultConfig.pinecone,
          ...config.pinecone
        }
      }
    }
    return defaultConfig
  })
  const [newUrl, setNewUrl] = useState('')
  const [activeJobs, setActiveJobs] = useState<ScanJob[]>([])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [mode, setMode] = useState<'crawl' | 'pinecone'>('crawl')

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

  const updatePineconeConfig = (update: Partial<SmartSearchConfig['pinecone']>) => {
    const updatedConfig = {
      ...localConfig,
      pinecone: {
        ...localConfig.pinecone,
        ...update
      }
    }
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const handleChange = (field: keyof SmartSearchConfig, value: any) => {
    onChange({
      ...localConfig,
      [field]: value
    })
  }

  const handlePineconeChange = (field: keyof SmartSearchConfig['pinecone'], value: string) => {
    onChange({
      ...localConfig,
      pinecone: {
        ...localConfig.pinecone,
        [field]: value
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Smart Search Konfiguration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>URLs (eine pro Zeile)</Label>
          <Textarea
            value={localConfig.urls.join('\n')}
            onChange={e => handleChange('urls', e.target.value.split('\n').filter(Boolean))}
            placeholder="https://example.com"
          />
        </div>

        <div>
          <Label>Ausschlussmuster (eine pro Zeile)</Label>
          <Textarea
            value={localConfig.excludePatterns.join('\n')}
            onChange={e => handleChange('excludePatterns', e.target.value.split('\n').filter(Boolean))}
            placeholder="/admin/*"
          />
        </div>

        <div>
          <Label>System Prompt</Label>
          <Textarea
            value={localConfig.systemPrompt}
            onChange={e => handleChange('systemPrompt', e.target.value)}
          />
        </div>

        <div>
          <Label>User Prompt</Label>
          <Textarea
            value={localConfig.userPrompt}
            onChange={e => handleChange('userPrompt', e.target.value)}
          />
        </div>

        <div>
          <Label>Followup Prompt</Label>
          <Textarea
            value={localConfig.followupPrompt}
            onChange={e => handleChange('followupPrompt', e.target.value)}
          />
        </div>

        <div>
          <Label>Pinecone Index</Label>
          <Input
            value={localConfig.pinecone.indexName}
            onChange={e => handlePineconeChange('indexName', e.target.value)}
            placeholder="Name des Pinecone Index"
          />
        </div>

        <div>
          <Label>Pinecone Environment</Label>
          <Input
            value={localConfig.pinecone.environment}
            onChange={e => handlePineconeChange('environment', e.target.value)}
            placeholder="z.B. us-east-1-aws"
          />
        </div>

        <div>
          <Label>Chunk Size</Label>
          <Input
            type="number"
            value={localConfig.chunkSize}
            onChange={e => handleChange('chunkSize', parseInt(e.target.value))}
          />
        </div>

        <div>
          <Label>Temperature</Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={localConfig.temperature}
            onChange={e => handleChange('temperature', parseFloat(e.target.value))}
          />
        </div>

        <div>
          <Label>Max Tokens</Label>
          <Input
            type="number"
            value={localConfig.maxTokens}
            onChange={e => handleChange('maxTokens', parseInt(e.target.value))}
          />
        </div>
      </CardContent>
    </Card>
  )
} 