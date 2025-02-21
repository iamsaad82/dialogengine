'use client'

import { useState } from 'react'
import { Label } from '../label'
import { toast } from 'sonner'
import { Loader2, Upload, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BaseStatus } from '@/lib/types/jobs'

export interface BaseUploaderProps {
  id: string
  label: string
  accept?: string
  maxSize?: number // in MB
  multiple?: boolean
  onUpload: (files: File[]) => Promise<void>
  uploadStatus?: BaseStatus
  className?: string
  children?: React.ReactNode
}

export function BaseUploader({
  id,
  label,
  accept,
  maxSize = 10,
  multiple = false,
  onUpload,
  uploadStatus,
  className,
  children
}: BaseUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    // Validiere Dateitypen wenn accept gesetzt ist
    if (accept) {
      const allowedTypes = accept.split(',').map(type => type.trim().toLowerCase())
      const invalidFiles = files.filter(file => {
        const fileType = file.type.toLowerCase()
        // Prüfe MIME-Type
        const isValidMimeType = allowedTypes.some(type => fileType === type)
        if (isValidMimeType) return false

        // Wenn MIME-Type nicht passt, prüfe Dateiendung
        const extension = '.' + file.name.split('.').pop()?.toLowerCase()
        const matchingType = allowedTypes.find(type => {
          if (type.startsWith('image/')) {
            // Konvertiere MIME-Types in entsprechende Endungen
            const ext = type.replace('image/', '.')
            return extension === ext || 
                   (type === 'image/jpeg' && (extension === '.jpg' || extension === '.jpeg'))
          }
          return false
        })
        return !matchingType
      })

      if (invalidFiles.length > 0) {
        toast.error(`Ungültige Dateitypen: ${invalidFiles.map(f => f.name).join(', ')}`)
        return
      }
    }

    // Validiere Dateigröße
    const oversizedFiles = files.filter(file => file.size > maxSize * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      toast.error(`Folgende Dateien sind zu groß (max. ${maxSize}MB): ${oversizedFiles.map(f => f.name).join(', ')}`)
      return
    }

    await handleFileUpload(files)
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    if (files.length === 0) return

    // Debug-Logging für Dateiinformationen
    files.forEach(file => {
      console.log('Debug - Dateiinformationen:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        acceptedTypes: accept?.split(',').map(t => t.trim()),
      })
    })

    // Validiere Dateitypen wenn accept gesetzt ist
    if (accept) {
      const allowedTypes = accept.split(',').map(type => type.trim().toLowerCase())
      console.log('Debug - Erlaubte Typen:', allowedTypes)

      const invalidFiles = files.filter(file => {
        const fileType = file.type.toLowerCase()
        const extension = '.' + file.name.split('.').pop()?.toLowerCase()
        
        console.log('Debug - Prüfe Datei:', {
          fileName: file.name,
          fileType,
          extension,
          allowedTypes
        })

        // Prüfe MIME-Type direkt
        if (allowedTypes.includes(fileType)) {
          console.log('Debug - MIME-Type ist direkt erlaubt:', fileType)
          return false
        }

        // Prüfe XML-Dateien
        if (extension === '.xml') {
          if (allowedTypes.includes('application/xml') || allowedTypes.includes('text/xml')) {
            console.log('Debug - XML-Datei ist erlaubt')
            return false
          }
        }

        // Prüfe Dateiendungen für Bilder
        if (allowedTypes.some(type => type.startsWith('image/'))) {
          // Mapping von Dateiendungen zu MIME-Types
          const extensionMimeMap: Record<string, string[]> = {
            '.jpg': ['image/jpeg'],
            '.jpeg': ['image/jpeg'],
            '.png': ['image/png'],
            '.webp': ['image/webp']
          }

          const allowedMimeTypes = extensionMimeMap[extension]
          if (allowedMimeTypes) {
            const isAllowed = allowedMimeTypes.some(mime => allowedTypes.includes(mime))
            console.log('Debug - Endungsprüfung:', {
              extension,
              allowedMimeTypes,
              isAllowed
            })
            return !isAllowed
          }
        }

        console.log('Debug - Datei ist nicht erlaubt:', {
          fileName: file.name,
          fileType,
          extension
        })
        return true
      })

      if (invalidFiles.length > 0) {
        console.log('Debug - Ungültige Dateien gefunden:', invalidFiles)
        toast.error(`Ungültige Dateitypen: ${invalidFiles.map(f => f.name).join(', ')}`)
        return
      }
    }

    // Validiere Dateigröße
    const oversizedFiles = files.filter(file => file.size > maxSize * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      toast.error(`Folgende Dateien sind zu groß (max. ${maxSize}MB): ${oversizedFiles.map(f => f.name).join(', ')}`)
      return
    }

    await handleFileUpload(files)
  }

  const handleFileUpload = async (files: File[]) => {
    try {
      setIsUploading(true)
      await onUpload(files)
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Upload fehlgeschlagen')
    } finally {
      setIsUploading(false)
    }
  }

  const getStatusIcon = () => {
    if (!uploadStatus) return null
    
    switch (uploadStatus.phase) {
      case 'queued':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'scanning':
      case 'analyzing':
      case 'indexing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div 
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-gray-200 hover:border-primary",
          className
        )}
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleFileDrop}
      >
        {children}
        
        <div className="flex flex-col items-center gap-2">
          <input
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileInput}
            className="hidden"
            id={id}
            disabled={isUploading}
          />
          <label
            htmlFor={id}
            className={cn(
              "bg-white px-4 py-2 rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer",
              isUploading && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="flex items-center gap-2">
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Wird hochgeladen...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>{multiple ? 'Dateien auswählen' : 'Datei auswählen'}</span>
                </>
              )}
            </div>
          </label>
          <p className="text-sm text-gray-500">
            oder per Drag & Drop
          </p>
        </div>
        
        {uploadStatus && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm">
            {getStatusIcon()}
            <span>{uploadStatus.details || uploadStatus.phase}</span>
            {uploadStatus.progress > 0 && (
              <span className="text-gray-500">({uploadStatus.progress}%)</span>
            )}
          </div>
        )}
        
        <div className="mt-2 text-xs text-gray-500">
          Maximale Größe: {maxSize}MB
          {accept && ` • Erlaubte Typen: ${accept}`}
        </div>
      </div>
    </div>
  )
} 