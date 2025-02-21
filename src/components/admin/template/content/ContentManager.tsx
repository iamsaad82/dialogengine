'use client'

import React from 'react'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Upload, RefreshCw, Database } from "lucide-react"
import type { Template, ContentTypeResult, UploadStatus } from '@/lib/types/template'
import { ContentTypeEditor } from '@/components/admin/template/content/ContentTypeEditor'
import { VectorManager } from '@/components/admin/template/content/VectorManager'
import { DocumentUpload } from '@/components/admin/template/content/DocumentUpload'
import { ContentType } from '@/lib/types/contentTypes'

interface ContentManagerProps {
  templateId: string
}

export function ContentManager({ templateId }: ContentManagerProps) {
  const [contentTypes, setContentTypes] = useState<ContentTypeResult[]>([])
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null)
  const [selectedType, setSelectedType] = useState<ContentType>('text')
  const [typeMetadata, setTypeMetadata] = useState<Record<string, any>>({})
  const { toast } = useToast()

  const handleContentTypesUpdate = (types: ContentTypeResult[]) => {
    setContentTypes(types)
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
            <DocumentUpload
              templateId={templateId}
              onUploadComplete={setUploadStatus}
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
              type={selectedType}
              onChange={setSelectedType}
              metadata={typeMetadata}
              onMetadataChange={setTypeMetadata}
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