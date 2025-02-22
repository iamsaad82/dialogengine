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
import { DocumentTypeEditor } from '../document/DocumentTypeEditor'
import { DocumentTypeList } from '../document/DocumentTypeList'
import type { DocumentTypeDefinition } from '@/lib/types/documentTypes'

interface DocumentUploadProps {
  templateId: string
  onUploadComplete?: (status: UploadStatus) => void
}

interface UploadProgress {
  fileName: string
  progress: number
  status: 'uploading' | 'processing' | 'complete' | 'error' | 'cancelled'
  error?: string
  jobId?: string
  templateId?: string
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
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeDefinition[]>([])
  const [selectedType, setSelectedType] = useState<DocumentTypeDefinition | null>(null)
  const [vectorTypes, setVectorTypes] = useState<ContentTypeResult[]>([])
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
          setDocumentTypes(prev => [...prev, ...newTypes])
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
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/xml': ['.xml'],
      'text/xml': ['.xml']
    }
  })

  const removeUpload = (fileName: string) => {
    setUploads(prev => prev.filter(upload => upload.fileName !== fileName))
  }

  const handleUpdated = async (type: DocumentTypeDefinition) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/document-types/${type.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(type)
      })
      
      if (!response.ok) throw new Error('Fehler beim Aktualisieren')
      
      const updatedType = await response.json()
      setDocumentTypes(prev => prev.map(t => t.id === updatedType.id ? updatedType : t))
      setSelectedType(null)
      
      toast({
        title: 'Dokumententyp aktualisiert',
        description: 'Die Änderungen wurden erfolgreich gespeichert.'
      })
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Dokumententyps:', error)
      toast({
        title: 'Fehler',
        description: 'Die Änderungen konnten nicht gespeichert werden.'
      })
    }
  }

  const handleDeleted = async (type: DocumentTypeDefinition) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/document-types/${type.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Fehler beim Löschen')
      
      setDocumentTypes(prev => prev.filter(t => t.id !== type.id))
      setSelectedType(null)
      
      toast({
        title: 'Dokumententyp gelöscht',
        description: 'Der Dokumententyp wurde erfolgreich gelöscht.'
      })
    } catch (error) {
      console.error('Fehler beim Löschen des Dokumententyps:', error)
      toast({
        title: 'Fehler',
        description: 'Der Dokumententyp konnte nicht gelöscht werden.'
      })
    }
  }

  // Konvertiere DocumentTypeDefinition zu ContentTypeResult für den VectorManager
  const getVectorTypes = (types: DocumentTypeDefinition[]): ContentTypeResult[] => {
    return types.map(type => ({
      type: type.type,
      confidence: type.metadata.confidence || 1,
      metadata: type.metadata
    }))
  }

  // Aktualisiere vectorTypes wenn sich documentTypes ändert
  useEffect(() => {
    setVectorTypes(getVectorTypes(documentTypes))
  }, [documentTypes])

  // Lade die Dokumententypen beim Start
  useEffect(() => {
    const loadDocumentTypes = async () => {
      try {
        const response = await fetch(`/api/templates/${templateId}/document-types`)
        if (!response.ok) throw new Error('Fehler beim Laden der Dokumententypen')
        const data = await response.json()
        setDocumentTypes(data)
      } catch (error) {
        console.error('Fehler beim Laden der Dokumententypen:', error)
        toast({
          title: 'Fehler',
          description: 'Die Dokumententypen konnten nicht geladen werden.'
        })
      }
    }
    loadDocumentTypes()
  }, [templateId])

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
                Unterstützte Formate: PDF, TXT, DOC, DOCX, XML
              </p>
            </div>

            <div className="space-y-4 mt-4">
              {uploads.map((upload) => (
                <div key={upload.fileName} className="relative">
                  <UploadStatus upload={upload} />
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="types">
          <Card className="p-6">
            {selectedType ? (
              <DocumentTypeEditor
                documentType={selectedType}
                onSave={handleUpdated}
                onCancel={() => setSelectedType(null)}
                onDelete={() => handleDeleted(selectedType)}
              />
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Dokumententypen</h3>
                <p className="text-sm text-muted-foreground">
                  Verwalten Sie hier die erkannten und definierten Dokumententypen.
                </p>
                <DocumentTypeList
                  documentTypes={documentTypes}
                  onEdit={setSelectedType}
                  onDelete={handleDeleted}
                />
              </div>
            )}
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
              contentTypes={vectorTypes}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function UploadStatus({ upload }: { upload: UploadProgress }) {
  const [isCancelling, setIsCancelling] = useState(false)

  const handleCancel = async () => {
    if (!upload.jobId) return
    
    try {
      setIsCancelling(true)
      const response = await fetch(`/api/templates/${upload.templateId}/upload/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobId: upload.jobId })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Abbrechen des Uploads')
      }

      toast({
        title: 'Upload abgebrochen',
        description: 'Der Upload wurde erfolgreich abgebrochen'
      })
    } catch (error) {
      console.error('Fehler beim Abbrechen:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Abbrechen des Uploads',
        variant: 'destructive'
      })
    } finally {
      setIsCancelling(false)
    }
  }

  const getStatusColor = () => {
    switch (upload.status) {
      case 'complete':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      case 'cancelled':
        return 'bg-gray-500'
      default:
        return 'bg-blue-500'
    }
  }

  const canBeCancelled = upload.status === 'uploading' || upload.status === 'processing'

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <span className="font-medium">{upload.fileName}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{upload.progress}%</span>
          {canBeCancelled && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              <span className="sr-only">Abbrechen</span>
            </Button>
          )}
        </div>
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