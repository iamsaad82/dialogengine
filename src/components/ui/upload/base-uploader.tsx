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
      const allowedExtensions = accept.split(',').map(ext => ext.trim().toLowerCase())
      const invalidFiles = files.filter(file => {
        const extension = '.' + file.name.split('.').pop()?.toLowerCase()
        return !allowedExtensions.includes(extension)
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

    // Validiere Dateitypen wenn accept gesetzt ist
    if (accept) {
      const allowedExtensions = accept.split(',').map(ext => ext.trim().toLowerCase())
      const invalidFiles = files.filter(file => {
        const extension = '.' + file.name.split('.').pop()?.toLowerCase()
        return !allowedExtensions.includes(extension)
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
      case 'vectorizing':
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