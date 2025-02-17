'use client'

import { useState, useRef, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { BaseUploader } from './base-uploader'
import { JobPhase, UploadStatus } from '@/lib/types/jobs'
import { cn } from '@/lib/utils'
import { Dropzone } from '@/components/ui/dropzone'
import { Progress } from '@/components/ui/progress'

// Typen für Warnungen und Fehler
interface WarningMessage {
  message: string
}

interface ErrorMessage {
  message: string
}

interface DetectedType {
  type: string
  confidence: number
}

// Basistyp für den Upload-Status
interface BaseUploadStatus {
  fileName: string
  progress: number
  phase: JobPhase
  error?: string
  details?: UploadDetails | string
  jobId?: string
  message?: string
}

// Details für erweiterte Statusinformationen
interface UploadDetails {
  currentOperation?: string
  processingDetails?: {
    stage?: string
    subStage?: string
    info?: string
  }
  performance?: {
    currentDuration: string
    estimatedTimeRemaining?: string
    averageSpeed?: string
  }
  warnings?: WarningMessage[]
  errors?: ErrorMessage[]
  detectedTypes?: DetectedType[]
}

interface DocumentUploaderProps {
  templateId: string
  onUploadComplete?: () => void
  className?: string
}

export function DocumentUploader({ 
  templateId, 
  onUploadComplete,
  className 
}: DocumentUploaderProps) {
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, BaseUploadStatus>>({})
  const { toast } = useToast()
  const pollingRefs = useRef<Record<string, boolean>>({})

  // Cleanup beim Unmount
  useEffect(() => {
    return () => {
      Object.keys(pollingRefs.current).forEach(fileName => {
        pollingRefs.current[fileName] = false
      })
    }
  }, [])

  const handleUpload = async (files: File[]) => {
    for (const file of files) {
      try {
        // Setze initialen Upload-Status
        setUploadStatuses(prev => ({
          ...prev,
          [file.name]: {
            fileName: file.name,
            jobId: '',
            phase: 'queued',
            progress: 0,
            details: 'Initialisierung'
          }
        }))

        // Erstelle einen neuen Job
        const jobResponse = await fetch('/api/jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            templateId,
            files: [file.name]
          })
        })

        if (!jobResponse.ok) {
          throw new Error('Fehler beim Erstellen des Jobs')
        }

        const job = await jobResponse.json()
        const jobId = job.id

        // Aktualisiere Upload-Status mit Job-ID
        setUploadStatuses(prev => ({
          ...prev,
          [file.name]: {
            ...prev[file.name],
            jobId,
            phase: 'uploading',
            progress: 0,
            details: 'Upload gestartet'
          }
        }))

        // Lade die Datei hoch
        const formData = new FormData()
        formData.append('file', file)
        formData.append('jobId', jobId)
        formData.append('templateId', templateId)

        const uploadResponse = await fetch('/api/upload/document', {
          method: 'POST',
          body: formData
        })

        if (!uploadResponse.ok) {
          console.error('Upload-Response nicht OK:', await uploadResponse.text())
          throw new Error('Fehler beim Hochladen der Datei')
        }

        console.log('Datei erfolgreich hochgeladen, starte Status-Polling')

        // Starte Polling für Job-Status
        pollingRefs.current[file.name] = true
        const pollInterval = setInterval(async () => {
          try {
            // Wenn das Polling für diese Datei gestoppt wurde, beende das Interval
            if (!pollingRefs.current[file.name]) {
              console.log(`Polling für ${file.name} wurde gestoppt`)
              clearInterval(pollInterval)
              return
            }

            const response = await fetch(`/api/jobs/${jobId}`)
            if (!response.ok) {
              throw new Error('Fehler beim Abrufen des Job-Status')
            }

            const jobStatus = await response.json()
            console.log(`Job-Status für ${file.name}:`, jobStatus)

            // Aktualisiere den Upload-Status
            setUploadStatuses(prev => ({
              ...prev,
              [file.name]: {
                fileName: file.name,
                jobId,
                phase: jobStatus.status.phase as JobPhase,
                progress: jobStatus.status.progress || 0,
                details: jobStatus.status.currentFile || '',
                error: jobStatus.status.errors?.[0]?.message,
                startTime: jobStatus.status.startedAt,
                estimatedTimeRemaining: jobStatus.status.estimatedTimeRemaining,
                processingSpeed: jobStatus.status.processingSpeed
              }
            }))

            // Wenn der Job abgeschlossen oder fehlgeschlagen ist, beende das Polling
            if (jobStatus.status.phase === 'completed' || jobStatus.status.phase === 'error') {
              console.log(`Job für ${file.name} ist ${jobStatus.status.phase}, beende Polling`)
              pollingRefs.current[file.name] = false
              clearInterval(pollInterval)

              if (jobStatus.status.phase === 'completed') {
                toast({
                  title: 'Upload erfolgreich',
                  description: `Die Datei ${file.name} wurde erfolgreich verarbeitet.`
                })
                console.log('Rufe onUploadComplete Callback auf')
                onUploadComplete?.()
              } else {
                toast({
                  title: 'Fehler bei der Verarbeitung',
                  description: jobStatus.status.errors?.[0]?.message || `Die Datei ${file.name} konnte nicht verarbeitet werden.`
                })
              }

              // Entferne den Status nach kurzer Verzögerung
              setTimeout(() => {
                setUploadStatuses(prev => {
                  const newStatuses = { ...prev }
                  delete newStatuses[file.name]
                  return newStatuses
                })
              }, 3000)
            }
          } catch (error) {
            console.error('Fehler beim Polling:', error)
            pollingRefs.current[file.name] = false
            clearInterval(pollInterval)
            
            setUploadStatuses(prev => ({
              ...prev,
              [file.name]: {
                fileName: file.name,
                jobId,
                phase: 'error',
                progress: 0,
                details: 'Fehler beim Abrufen des Job-Status',
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
              }
            }))

            toast({
              title: 'Fehler beim Abrufen des Status',
              description: `Der Status für ${file.name} konnte nicht abgerufen werden.`
            })
          }
        }, 2000)

      } catch (error) {
        console.error('Upload-Fehler:', error)
        toast({
          title: 'Fehler',
          description: error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.'
        })

        setUploadStatuses(prev => ({
          ...prev,
          [file.name]: {
            ...prev[file.name],
            phase: 'error',
            error: error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.'
          }
        }))
      }
    }
  }

  const getStatusText = (status: BaseUploadStatus) => {
    if (!status) return ''
    
    if (typeof status.details === 'string') {
      return status.details
    }
    
    if (!status.details) {
      return ''
    }
    
    const processing = status.details.processingDetails || {}
    let text = ''
    
    if (status.details.currentOperation) {
      text += status.details.currentOperation
    }
    
    if (processing.stage) {
      text += text ? `\n${processing.stage}` : processing.stage
      if (processing.subStage) {
        text += ` - ${processing.subStage}`
      }
      if (processing.info) {
        text += `\n${processing.info}`
      }
    }
    
    if (status.details.performance) {
      const perf = status.details.performance
      text += text ? `\nLaufzeit: ${perf.currentDuration}` : `Laufzeit: ${perf.currentDuration}`
      if (perf.estimatedTimeRemaining) {
        text += ` (noch ca. ${perf.estimatedTimeRemaining})`
      }
      if (perf.averageSpeed) {
        text += `\nGeschwindigkeit: ${perf.averageSpeed}`
      }
    }
    
    return text || 'Verarbeitung läuft...'
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Dropzone onDrop={handleUpload}>
        {/* ... existing dropzone code ... */}
      </Dropzone>

      {Object.entries(uploadStatuses).map(([fileName, status]) => (
        <div key={fileName} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">{fileName}</span>
            <span className="text-sm text-muted-foreground">
              {status.progress}%
            </span>
          </div>
          
          <Progress value={status.progress} className="h-2" />
          
          <div className="space-y-1 text-sm">
            <pre className="whitespace-pre-wrap font-mono text-xs">
              {typeof status.details === 'string' ? status.details : getStatusText(status)}
            </pre>
            
            {typeof status.details === 'object' && status.details?.warnings && status.details.warnings.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="font-medium text-yellow-600 dark:text-yellow-400">Warnungen:</p>
                {status.details.warnings.map((warning: WarningMessage, i: number) => (
                  <p key={i} className="text-xs text-yellow-600 dark:text-yellow-400">
                    {warning.message}
                  </p>
                ))}
              </div>
            )}
            
            {typeof status.details === 'object' && status.details?.errors && status.details.errors.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="font-medium text-red-600 dark:text-red-400">Fehler:</p>
                {status.details.errors.map((error: ErrorMessage, i: number) => (
                  <p key={i} className="text-xs text-red-600 dark:text-red-400">
                    {error.message}
                  </p>
                ))}
              </div>
            )}
            
            {typeof status.details === 'object' && status.details?.detectedTypes && status.details.detectedTypes.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Erkannte Typen:</p>
                <div className="grid grid-cols-2 gap-2">
                  {status.details.detectedTypes.map((type: DetectedType, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span>{type.type}</span>
                      <span className="text-muted-foreground">
                        {(type.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
} 