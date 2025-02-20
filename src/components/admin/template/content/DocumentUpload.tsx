'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Upload, File, X } from "lucide-react"
import type { UploadStatus } from '@/lib/types/template'

interface DocumentUploadProps {
  templateId: string
  onUploadComplete: (status: UploadStatus) => void
}

export function DocumentUpload({ templateId, onUploadComplete }: DocumentUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    }
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async () => {
    if (files.length === 0) return

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
      pollUploadStatus(data.jobId)
    } catch (error) {
      console.error('Fehler beim Upload:', error)
      onUploadComplete({
        stage: 'error',
        progress: 0,
        message: 'Fehler beim Upload der Dokumente'
      })
      setUploading(false)
    }
  }

  const pollUploadStatus = async (jobId: string) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/upload/status?jobId=${jobId}`)
      const status = await response.json()

      onUploadComplete(status)

      if (status.stage !== 'complete' && status.stage !== 'error') {
        setTimeout(() => pollUploadStatus(jobId), 1000)
      } else {
        setUploading(false)
        if (status.stage === 'complete') {
          setFiles([])
        }
      }
    } catch (error) {
      console.error('Fehler beim Status-Check:', error)
      onUploadComplete({
        stage: 'error',
        progress: 0,
        message: 'Fehler beim Überprüfen des Upload-Status'
      })
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">
          {isDragActive
            ? 'Dateien hier ablegen...'
            : 'Dateien hierher ziehen oder klicken zum Auswählen'}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Unterstützte Formate: PDF, TXT, DOC, DOCX
        </p>
      </div>

      {files.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-2">Ausgewählte Dateien</h3>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-muted rounded"
              >
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4" />
                  <span className="text-sm">{file.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              onClick={uploadFiles}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Wird hochgeladen...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {files.length} {files.length === 1 ? 'Datei' : 'Dateien'} hochladen
                </>
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
} 