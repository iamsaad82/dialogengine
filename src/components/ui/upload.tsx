import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2, Upload, Image as ImageIcon, X } from "lucide-react"
import Image from 'next/image'
import { UploadCloud } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UploadStatus } from '@/lib/types/template'

interface ImageUploaderProps {
  currentImage?: string
  onUpload: (url: string) => void
  aspectRatio?: 'square' | 'landscape' | 'portrait'
  maxSize?: number
}

export function ImageUploader({ 
  currentImage, 
  onUpload, 
  aspectRatio = 'square',
  maxSize = 500 
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string>(currentImage || '')

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload fehlgeschlagen')
      }

      const data = await response.json()
      setPreview(data.url)
      onUpload(data.url)
    } catch (error) {
      console.error('Fehler beim Upload:', error)
    } finally {
      setUploading(false)
    }
  }

  const removeImage = () => {
    setPreview('')
    onUpload('')
  }

  const getAspectRatio = () => {
    switch (aspectRatio) {
      case 'landscape':
        return 'aspect-video'
      case 'portrait':
        return 'aspect-[3/4]'
      default:
        return 'aspect-square'
    }
  }

  return (
    <div className="relative w-full">
      {preview ? (
        <div className="relative rounded-lg border bg-muted">
          <Image
            src={preview}
            alt="Vorschau"
            width={maxSize}
            height={maxSize}
            className="rounded-lg object-contain"
            style={{
              maxWidth: '100%',
              height: 'auto'
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={removeImage}
            className="absolute right-2 top-2"
          >
            Entfernen
          </Button>
        </div>
      ) : (
        <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-muted hover:bg-muted/80">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Klicken oder Datei hierher ziehen
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp"
          />
        </label>
      )}
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
    </div>
  )
}

interface DocumentUploaderProps {
  onUpload?: (files: File[]) => void
  templateId?: string
  onUploadComplete?: (status: UploadStatus) => void
  accept?: string
  multiple?: boolean
  maxSize?: number
}

export function DocumentUploader({ 
  onUpload, 
  templateId,
  onUploadComplete,
  accept = '.pdf,.doc,.docx,.txt,.md', 
  multiple = true,
  maxSize = 10 // in MB
}: DocumentUploaderProps) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
  }

  const validateFiles = (files: File[]) => {
    // Überprüfe Dateitypen
    const invalidTypes = files.filter(file => {
      const fileType = file.name.split('.').pop()?.toLowerCase()
      return !accept.includes(fileType || '')
    })

    if (invalidTypes.length > 0) {
      setError(`Ungültige Dateitypen: ${invalidTypes.map(f => f.name).join(', ')}`)
      return false
    }

    // Überprüfe Dateigrößen
    const oversizedFiles = files.filter(file => file.size > maxSize * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      setError(`Dateien zu groß: ${oversizedFiles.map(f => f.name).join(', ')}`)
      return false
    }

    return true
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    setError(null)

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (!multiple && droppedFiles.length > 1) {
      setError('Bitte nur eine Datei hochladen')
      return
    }

    if (validateFiles(droppedFiles)) {
      if (onUpload) {
        onUpload(droppedFiles)
      } else if (templateId) {
        await uploadFiles(droppedFiles)
      }
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const selectedFiles = Array.from(e.target.files || [])
    
    if (!multiple && selectedFiles.length > 1) {
      setError('Bitte nur eine Datei hochladen')
      return
    }

    if (validateFiles(selectedFiles)) {
      if (onUpload) {
        onUpload(selectedFiles)
      } else if (templateId) {
        await uploadFiles(selectedFiles)
      }
    }
  }

  const uploadFiles = async (files: File[]) => {
    if (!templateId || files.length === 0) return

    setUploading(true)
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))

    try {
      const response = await fetch(`/api/templates/${templateId}/upload`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Upload')
      }

      // Starte das Polling für den Upload-Status
      if (onUploadComplete) {
        pollUploadStatus(data.jobId)
      }
    } catch (error) {
      console.error('Fehler beim Upload:', error)
      setError(error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten')
      if (onUploadComplete) {
        onUploadComplete({
          stage: 'error',
          progress: 0,
          message: 'Fehler beim Upload der Dokumente'
        })
      }
    } finally {
      setUploading(false)
    }
  }

  const pollUploadStatus = async (jobId: string) => {
    if (!templateId || !onUploadComplete) return

    try {
      const response = await fetch(`/api/templates/${templateId}/upload/status?jobId=${jobId}`)
      const status = await response.json()

      onUploadComplete(status)

      if (status.stage !== 'complete' && status.stage !== 'error') {
        setTimeout(() => pollUploadStatus(jobId), 1000)
      }
    } catch (error) {
      console.error('Fehler beim Status-Check:', error)
      onUploadComplete({
        stage: 'error',
        progress: 0,
        message: 'Fehler beim Überprüfen des Upload-Status'
      })
    }
  }

  return (
    <div className="w-full">
      <label
        className={cn(
          "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80",
          dragging && "border-primary bg-primary/10",
          error && "border-destructive"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {uploading ? (
            <Loader2 className="w-8 h-8 mb-2 animate-spin text-muted-foreground" />
          ) : (
            <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">
            {uploading ? 'Wird hochgeladen...' : (
              multiple ? (
                <>Dateien hierher ziehen oder <span className="font-medium">auswählen</span></>
              ) : (
                <>Datei hierher ziehen oder <span className="font-medium">auswählen</span></>
              )
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {accept.split(',').join(', ')} (max. {maxSize}MB)
          </p>
        </div>
        <input
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept={accept}
          multiple={multiple}
          disabled={uploading}
        />
      </label>
      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}

export * from './upload' 