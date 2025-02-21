'use client'

import React from 'react'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Upload, File, X, AlertCircle } from "lucide-react"
import type { UploadStatus } from '@/lib/types/upload'
import type { ContentTypeResult } from '@/lib/types/template'
import { ContentType } from '@/lib/types/contentTypes'
import { ContentTypeEditor } from './ContentTypeEditor'
import { VectorManager } from './VectorManager'
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface DocumentUploadProps {
  templateId: string
  onUploadComplete?: (status: UploadStatus) => void
}

interface UploadProgress {
  fileName: string
  progress: number
  status: 'uploading' | 'processing' | 'complete' | 'error'
  error?: string
  jobId?: string
  details?: {
    operation?: string
    stage?: string
    message?: string
    detectedType?: string
    confidence?: number
    handlerId?: string
    handlerType?: string
    vectorStatus?: string
    vectorCount?: number
  }
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  templateId,
  onUploadComplete
}) => {
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [contentTypes, setContentTypes] = useState<ContentTypeResult[]>([])
  const [selectedType, setSelectedType] = useState<ContentType>('text')
  const [typeMetadata, setTypeMetadata] = useState<Record<string, any>>({})
  const pollingRef = useRef<{[key: string]: NodeJS.Timeout}>({})

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      Object.values(pollingRef.current).forEach(timeout => clearTimeout(timeout))
    }
  }, [])

  const pollUploadStatus = async (jobId: string) => {
    if (typeof window === 'undefined') return // Verhindere Server-Side Ausführung
    
    try {
      const response = await fetch(`/api/templates/${templateId}/upload?jobId=${jobId}`, {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error(`Status-Abfrage fehlgeschlagen: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Status Update:', data) // Debug-Log
      
      // Normalisiere den Status
      const status = {
        phase: data.stage || data.status || 'processing',
        progress: data.progress || 0,
        error: data.error,
        details: data.details || {},
        message: data.message || 'Wird verarbeitet...',
        currentOperation: data.details?.currentOperation,
        processingDetails: data.details?.processingDetails
      }
      
      setUploads(prev => prev.map(upload => 
        upload.jobId === jobId ? {
          ...upload,
          progress: status.progress,
          status: status.phase === 'error' ? 'error' : 
                 status.phase === 'completed' ? 'complete' : 
                 'processing',
          error: status.error?.message || status.error,
          details: {
            operation: status.currentOperation,
            stage: status.processingDetails?.stage,
            message: status.processingDetails?.message,
            detectedType: status.details?.detectedType,
            confidence: status.details?.confidence
          }
        } : upload
      ))

      // Aktualisiere die UI mit detaillierten Informationen
      if (status.currentOperation) {
        console.log(`[${jobId}] Operation: ${status.currentOperation}`)
      }
      if (status.processingDetails) {
        console.log(`[${jobId}] Stage: ${status.processingDetails.stage} - ${status.processingDetails.message}`)
      }

      // Setze Polling fort, wenn noch nicht abgeschlossen
      if (status.phase !== 'completed' && status.phase !== 'error') {
        pollingRef.current[jobId] = setTimeout(() => pollUploadStatus(jobId), 2000)
      } else {
        if (pollingRef.current[jobId]) {
          clearTimeout(pollingRef.current[jobId])
          delete pollingRef.current[jobId]
        }
        
        // Benachrichtige über Abschluss
        if (status.phase === 'completed') {
          toast({
            title: 'Upload abgeschlossen',
            description: `Alle Dateien wurden erfolgreich verarbeitet.`,
          })
        } else if (status.phase === 'error') {
          toast({
            title: 'Fehler beim Upload',
            description: status.error || 'Ein unbekannter Fehler ist aufgetreten.',
            variant: 'destructive'
          })
        }

        // Aktualisiere Content-Types bei erfolgreichem Upload
        if (status.phase === 'complete' && status.details?.detectedTypes) {
          const newTypes = status.details.detectedTypes.map((type: any) => ({
            type: type.type,
            confidence: type.confidence,
            metadata: {}
          }))
          setContentTypes(prev => [...prev, ...newTypes])
        }
      }
    } catch (error) {
      console.error('Fehler beim Status-Update:', error)
      setUploads(prev => prev.map(upload => 
        upload.jobId === jobId ? {
          ...upload,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unbekannter Fehler beim Status-Update'
        } : upload
      ))
      
      if (pollingRef.current[jobId]) {
        clearTimeout(pollingRef.current[jobId])
        delete pollingRef.current[jobId]
      }
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const formData = new FormData()
      formData.append('files', file)

      setUploads(prev => [...prev, {
        fileName: file.name,
        progress: 0,
        status: 'uploading'
      }])

      try {
        const response = await fetch(`/api/templates/${templateId}/upload`, {
          method: 'POST',
          body: formData
        })

        if (!response.ok) throw new Error('Upload fehlgeschlagen')
        
        const data = await response.json()
        const jobId = data.jobId

        setUploads(prev => prev.map(upload => 
          upload.fileName === file.name ? {
            ...upload,
            jobId,
            status: 'processing',
            progress: 0
          } : upload
        ))

        pollUploadStatus(jobId)
      } catch (error) {
        console.error('Fehler beim Upload:', error)
        setUploads(prev => prev.map(upload => 
          upload.fileName === file.name ? {
            ...upload,
            status: 'error',
            error: 'Upload fehlgeschlagen'
          } : upload
        ))
      }
    }
  }, [templateId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'text/x-markdown': ['.md'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    }
  })

  const removeUpload = (fileName: string) => {
    setUploads(prev => prev.filter(upload => upload.fileName !== fileName))
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
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}`}
            >
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-gray-600">
                {isDragActive
                  ? 'Dateien hier ablegen...'
                  : 'Dateien hierher ziehen oder klicken zum Auswählen'}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Unterstützte Formate: PDF, TXT, DOC, DOCX
              </p>
            </div>

            {uploads.length > 0 && (
              <div className="space-y-2 mt-4">
                {uploads.map((upload, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <File className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">{upload.fileName}</p>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant={
                                upload.status === 'complete' ? 'default' :
                                upload.status === 'error' ? 'destructive' :
                                'secondary'
                              }
                            >
                              {upload.status === 'uploading' && 'Wird hochgeladen...'}
                              {upload.status === 'processing' && 'Wird verarbeitet...'}
                              {upload.status === 'complete' && 'Abgeschlossen'}
                              {upload.status === 'error' && 'Fehler'}
                            </Badge>
                            {upload.error && (
                              <span className="text-xs text-red-500">{upload.error}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {upload.status === 'uploading' && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUpload(upload.fileName)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {(upload.status === 'uploading' || upload.status === 'processing') && (
                      <div className="mt-2">
                        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${upload.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
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

      <div className="space-y-4">
        {uploads.map((upload) => (
          <div key={upload.fileName} className="relative">
            <UploadStatus upload={upload} />
          </div>
        ))}
      </div>
    </div>
  )
}

function UploadStatus({ upload }: { upload: UploadProgress }) {
  const getStatusColor = () => {
    switch (upload.status) {
      case 'complete':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-blue-500'
    }
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <span className="font-medium">{upload.fileName}</span>
        <span className="text-sm text-muted-foreground">{upload.progress}%</span>
      </div>

      {/* Fortschrittsbalken */}
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${getStatusColor()}`}
          style={{ width: `${upload.progress}%` }}
        />
      </div>

      {/* Detaillierte Status-Informationen */}
      <div className="space-y-2 text-sm">
        {upload.details?.operation && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Aktuelle Operation:</span>
            <span className="font-medium">{upload.details.operation}</span>
          </div>
        )}

        {upload.details?.stage && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Verarbeitungsphase:</span>
            <span className="font-medium">{upload.details.stage}</span>
          </div>
        )}

        {/* Content-Type Erkennung */}
        {upload.details?.detectedType && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Erkannter Content-Type</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Typ:</span>
                <span className="font-medium">{upload.details.detectedType}</span>
              </div>
              {upload.details.confidence !== undefined && (
                <div className="flex justify-between">
                  <span>Konfidenz:</span>
                  <span className="font-medium">{(upload.details.confidence * 100).toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Handler-Informationen */}
        {upload.details?.handlerId && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Generierter Handler</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Handler-ID:</span>
                <span className="font-medium">{upload.details.handlerId}</span>
              </div>
              {upload.details.handlerType && (
                <div className="flex justify-between">
                  <span>Typ:</span>
                  <span className="font-medium">{upload.details.handlerType}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vektorisierungs-Status */}
        {upload.details?.vectorStatus && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Vektorisierung</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-medium">{upload.details.vectorStatus}</span>
              </div>
              {upload.details.vectorCount !== undefined && (
                <div className="flex justify-between">
                  <span>Anzahl Vektoren:</span>
                  <span className="font-medium">{upload.details.vectorCount}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fehleranzeige */}
        {upload.error && (
          <div className="mt-4 p-3 bg-red-500/10 rounded-lg">
            <div className="flex items-center text-red-500">
              <AlertCircle className="h-4 w-4 mr-2" />
              <p className="font-medium">Fehler</p>
            </div>
            <p className="mt-1 text-sm text-red-500/80">{upload.error}</p>
          </div>
        )}
      </div>
    </div>
  )
} 