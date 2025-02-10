'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { BaseUploader } from './base-uploader'
import { UploadStatus } from '@/lib/types/jobs'

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
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, UploadStatus>>({})
  const { toast } = useToast()

  const handleUpload = async (files: File[]) => {
    for (const file of files) {
      try {
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

        // Initialisiere Status
        setUploadStatuses(prev => ({
          ...prev,
          [file.name]: {
            fileName: file.name,
            jobId,
            phase: 'queued',
            progress: 0
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
          throw new Error('Fehler beim Hochladen der Datei')
        }

        // Starte Polling für Job-Status
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`/api/jobs/${jobId}`)
            if (!statusResponse.ok) {
              clearInterval(pollInterval)
              return
            }

            const jobStatus = await statusResponse.json()
            
            setUploadStatuses(prev => ({
              ...prev,
              [file.name]: {
                ...prev[file.name],
                phase: jobStatus.phase,
                progress: jobStatus.progress,
                details: jobStatus.currentFile,
                error: jobStatus.error
              }
            }))

            if (jobStatus.phase === 'completed') {
              clearInterval(pollInterval)
              toast({
                title: 'Erfolg',
                description: `${file.name} wurde erfolgreich verarbeitet.`
              })
              onUploadComplete?.()
            } else if (jobStatus.phase === 'error') {
              clearInterval(pollInterval)
              toast({
                title: 'Fehler',
                description: jobStatus.error || 'Ein unbekannter Fehler ist aufgetreten.'
              })
            }
          } catch (error) {
            console.error('Fehler beim Abrufen des Job-Status:', error)
            clearInterval(pollInterval)
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

  return (
    <BaseUploader
      id="document-upload"
      label="Dokumente hochladen"
      accept=".md,.txt,.pdf,.doc,.docx"
      multiple={true}
      maxSize={10}
      onUpload={handleUpload}
      uploadStatus={Object.values(uploadStatuses)[0]} // Zeige Status des ersten Uploads
      className={className}
    >
      {Object.values(uploadStatuses).length > 0 && (
        <div className="mb-4 space-y-2">
          {Object.values(uploadStatuses).map((status) => (
            <div
              key={status.fileName}
              className="flex items-center justify-between p-2 bg-muted rounded text-sm"
            >
              <span className="truncate">{status.fileName}</span>
              <span className="text-muted-foreground">
                {status.phase === 'error' ? (
                  <span className="text-red-500">{status.error}</span>
                ) : (
                  <span>{status.details || status.phase} {status.progress}%</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </BaseUploader>
  )
} 