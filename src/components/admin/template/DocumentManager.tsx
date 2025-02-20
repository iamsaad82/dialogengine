'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { DocumentUploader } from '@/components/ui/upload'
import { ContentTypeEditor } from './content/ContentTypeEditor'
import { VectorManager } from './content/VectorManager'
import { useToast } from '@/components/ui/use-toast'
import type { ContentTypeResult, UploadStatus } from '@/lib/types/template'

interface DocumentManagerProps {
  templateId: string
}

export function DocumentManager({ templateId }: DocumentManagerProps) {
  const [contentTypes, setContentTypes] = useState<ContentTypeResult[]>([])
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null)
  const { toast } = useToast()

  const handleUploadComplete = async (status: UploadStatus) => {
    setUploadStatus(status)
    if (status.stage === 'complete' && status.details?.detectedTypes) {
      // Aktualisiere die Content-Types basierend auf den erkannten Typen
      const newTypes = status.details.detectedTypes.map(type => ({
        type: type.type,
        confidence: type.confidence,
        metadata: {}
      }))
      setContentTypes(prev => [...prev, ...newTypes])

      toast({
        title: 'Upload erfolgreich',
        description: 'Dokument wurde verarbeitet und der Wissensbasis hinzugefügt.'
      })
    }
  }

  const handleContentTypesUpdate = (updatedTypes: ContentTypeResult[]) => {
    setContentTypes(updatedTypes)
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">Dokumente hochladen</TabsTrigger>
          <TabsTrigger value="types">Dokumententypen</TabsTrigger>
          <TabsTrigger value="vectors">Vektoren & Indexierung</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Dokumente hochladen</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Laden Sie hier Dokumente hoch. Diese werden automatisch analysiert und für den Chatbot aufbereitet.
            </p>
            <DocumentUploader
              templateId={templateId}
              onUploadComplete={handleUploadComplete}
            />
            {uploadStatus && (
              <div className="mt-4">
                <UploadProgress status={uploadStatus} />
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="types">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Erkannte Dokumententypen</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Hier sehen Sie die automatisch erkannten Dokumententypen und deren Klassifizierung für die Wissensbasis.
            </p>
            <ContentTypeEditor
              templateId={templateId}
              contentTypes={contentTypes}
              onUpdate={handleContentTypesUpdate}
            />
          </Card>
        </TabsContent>

        <TabsContent value="vectors">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Vektoren & Indexierung</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Verwalten Sie hier die Vektorindexierung Ihrer Dokumente für die Wissensbasis.
            </p>
            <VectorManager
              templateId={templateId}
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
    if (status.stage === 'error') return 'bg-red-500'
    if (status.stage === 'complete') return 'bg-green-500'
    return 'bg-blue-500'
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{status.message}</span>
        <span>{status.progress}%</span>
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
          {status.details.processingDetails && (
            <p>
              {status.details.processingDetails.stage} 
              {status.details.processingDetails.subStage && ` - ${status.details.processingDetails.subStage}`}
            </p>
          )}
        </div>
      )}
    </div>
  )
} 