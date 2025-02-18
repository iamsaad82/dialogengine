'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useToast } from '@/components/ui/use-toast'
import { BaseUploader } from './base-uploader'
import { BaseStatus } from '@/lib/types/jobs'

export interface ImageUploaderProps {
  id: string
  label: string
  value: string
  onChange: (url: string) => void
  accept?: string
  aspectRatio?: 'square' | 'landscape' | 'portrait'
  maxSize?: number // in MB
  className?: string
}

export function ImageUploader({
  id,
  label,
  value,
  onChange,
  accept = 'image/jpeg,image/png,image/webp',
  aspectRatio = 'landscape',
  maxSize = 2,
  className
}: ImageUploaderProps) {
  const [uploadStatus, setUploadStatus] = useState<BaseStatus>()
  const { toast } = useToast()

  const handleUpload = async (files: File[]) => {
    const file = files[0] // Nur das erste Bild verwenden
    if (!file) return

    try {
      setUploadStatus({
        phase: 'scanning',
        progress: 0,
        details: 'Bild wird hochgeladen...'
      })

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload fehlgeschlagen')
      }

      const data = await response.json()
      onChange(data.url)
      
      setUploadStatus({
        phase: 'completed',
        progress: 100,
        details: 'Bild erfolgreich hochgeladen'
      })

      toast({
        title: 'Erfolg',
        description: 'Bild wurde erfolgreich hochgeladen'
      })
    } catch (error) {
      console.error('Upload error:', error)
      
      setUploadStatus({
        phase: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Upload fehlgeschlagen'
      })

      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Upload fehlgeschlagen'
      })
    }
  }

  const aspectRatioClass = {
    square: 'aspect-square',
    landscape: 'aspect-[3/2]',
    portrait: 'aspect-[2/3]'
  }[aspectRatio]

  return (
    <BaseUploader
      id={id}
      label={label}
      accept={accept}
      maxSize={maxSize}
      multiple={false}
      onUpload={handleUpload}
      uploadStatus={uploadStatus}
      className={className}
    >
      {value ? (
        <div className={`relative w-full ${aspectRatioClass} mb-4`}>
          <Image
            src={value}
            alt={label}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      ) : (
        <div className={`w-full ${aspectRatioClass} mb-4 flex items-center justify-center border rounded-lg bg-gray-50`}>
          <p className="text-gray-400">Kein Bild ausgewählt</p>
        </div>
      )}
    </BaseUploader>
  )
} 