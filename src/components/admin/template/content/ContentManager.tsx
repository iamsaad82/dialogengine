'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Upload, RefreshCw, Database } from "lucide-react"
import type { Template, ContentTypeResult, UploadStatus } from '@/lib/types/template'
import { ContentTypeEditor } from './ContentTypeEditor'
import { VectorManager } from './VectorManager'
import { DocumentUpload } from './DocumentUpload'

interface ContentManagerProps {
  template: Template
  onUpdate: (template: Template) => void
}

export function ContentManager({ template, onUpdate }: ContentManagerProps) {
  const [activeTab, setActiveTab] = useState('upload')
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null)
  const [contentTypes, setContentTypes] = useState<ContentTypeResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const handleUploadComplete = async (status: UploadStatus) => {
    setUploadStatus(status)
    if (status.stage === 'complete') {
      // Aktualisiere die Content-Typen
      try {
        const response = await fetch(`/api/templates/${template.id}/content-types`)
        const data = await response.json()
        setContentTypes(data)
        setActiveTab('types')
      } catch (error) {
        console.error('Fehler beim Laden der Content-Typen:', error)
        toast({
          title: 'Fehler',
          description: 'Die Content-Typen konnten nicht geladen werden.'
        })
      }
    }
  }

  const handleReindex = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/templates/${template.id}/reindex`, {
        method: 'POST'
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Reindexieren')
      }

      toast({
        title: 'Erfolg',
        description: 'Die Vektorisierung wurde gestartet.'
      })
    } catch (error) {
      console.error('Fehler beim Reindexieren:', error)
      toast({
        title: 'Fehler',
        description: 'Die Vektorisierung konnte nicht gestartet werden.'
      })
    }
    setIsProcessing(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Content Management</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReindex}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Neu indexieren
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="types">
            <Database className="h-4 w-4 mr-2" />
            Content-Typen
          </TabsTrigger>
          <TabsTrigger value="vectors">
            <Database className="h-4 w-4 mr-2" />
            Vektoren
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-4">
          <Card className="p-4">
            <DocumentUpload
              templateId={template.id}
              onUploadComplete={handleUploadComplete}
            />
            {uploadStatus && (
              <div className="mt-4">
                <UploadProgress status={uploadStatus} />
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="types" className="mt-4">
          <Card className="p-4">
            <ContentTypeEditor
              templateId={template.id}
              contentTypes={contentTypes}
              onUpdate={(types) => setContentTypes(types)}
            />
          </Card>
        </TabsContent>

        <TabsContent value="vectors" className="mt-4">
          <Card className="p-4">
            <VectorManager
              templateId={template.id}
              contentTypes={contentTypes}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function UploadProgress({ status }: { status: UploadStatus }) {
  const getProgressColor = () => {
    switch (status.stage) {
      case 'complete':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-blue-500'
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{status.message}</span>
        <span>{Math.round(status.progress)}%</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${getProgressColor()}`}
          style={{ width: `${status.progress}%` }}
        />
      </div>
      {status.details && (
        <div className="text-sm text-muted-foreground">
          {status.details.currentOperation && (
            <p>{status.details.currentOperation}</p>
          )}
          {status.details.documentsProcessed !== undefined && (
            <p>
              {status.details.documentsProcessed} von {status.details.totalDocuments} Dokumenten verarbeitet
            </p>
          )}
        </div>
      )}
    </div>
  )
} 