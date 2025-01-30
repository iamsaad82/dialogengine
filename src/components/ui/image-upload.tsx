'use client'

import { useState } from 'react'
import { Label } from './label'
import Image from 'next/image'
import { toast } from 'sonner'

type ImageUploadProps = {
  id: string
  label: string
  value: string
  onChange: (url: string) => void
  aspectRatio?: 'square' | 'landscape' | 'portrait'
  maxSize?: number // in MB
}

export function ImageUpload({ 
  id, 
  label, 
  value, 
  onChange,
  aspectRatio = 'landscape',
  maxSize = 2 
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    
    const file = e.dataTransfer?.files[0]
    if (file && file.type.startsWith('image/')) {
      if (file.size > maxSize * 1024 * 1024) {
        toast.error(`Datei ist zu groß. Maximale Größe: ${maxSize}MB`)
        return
      }
      await handleFileUpload(file)
    } else {
      toast.error('Bitte nur Bilder hochladen')
    }
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      if (file.size > maxSize * 1024 * 1024) {
        toast.error(`Datei ist zu groß. Maximale Größe: ${maxSize}MB`)
        return
      }
      await handleFileUpload(file)
    } else if (file) {
      toast.error('Bitte nur Bilder hochladen')
    }
  }

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true)
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
      console.log('Upload Response:', data)
      onChange(data.url)
      toast.success('Bild erfolgreich hochgeladen')
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Upload fehlgeschlagen')
    } finally {
      setIsUploading(false)
    }
  }

  const aspectRatioClass = {
    square: 'aspect-square',
    landscape: 'aspect-[3/2]',
    portrait: 'aspect-[2/3]'
  }[aspectRatio]

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div 
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary'
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleFileDrop}
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
        
        <div className="flex flex-col items-center gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            id={id}
            disabled={isUploading}
          />
          <label
            htmlFor={id}
            className={`bg-white px-4 py-2 rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer ${
              isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isUploading ? 'Wird hochgeladen...' : 'Bild auswählen'}
          </label>
          <p className="text-sm text-gray-500">
            oder per Drag & Drop
          </p>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Maximale Größe: {maxSize}MB
        </div>
      </div>
    </div>
  )
} 