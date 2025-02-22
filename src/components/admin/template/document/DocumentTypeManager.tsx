'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { DocumentTypeList } from './DocumentTypeList'
import { DocumentTypeEditor } from './DocumentTypeEditor'
import { DocumentUpload } from '../content/DocumentUpload'
import type { DocumentTypeDefinition } from '@/lib/types/documentTypes'
import type { UploadStatus } from '@/lib/types/upload'

interface DocumentTypeManagerProps {
  templateId: string
}

export function DocumentTypeManager({ templateId }: DocumentTypeManagerProps) {
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeDefinition[]>([])
  const [selectedType, setSelectedType] = useState<DocumentTypeDefinition | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadDocumentTypes()
  }, [templateId])

  const loadDocumentTypes = async () => {
    try {
      setLoading(true)
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
    } finally {
      setLoading(false)
    }
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

  const handleUploadComplete = (status: UploadStatus) => {
    loadDocumentTypes()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Dokumente-Upload</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Laden Sie hier Dokumente hoch und verwalten Sie deren Typen für die Wissensbasis.
          </p>
        </div>
      </div>

      <Card className="p-6">
        <DocumentUpload
          templateId={templateId}
          onUploadComplete={handleUploadComplete}
        />
      </Card>

      {selectedType && (
        <Card className="p-6">
          <DocumentTypeEditor
            documentType={selectedType}
            onSave={handleUpdated}
            onCancel={() => setSelectedType(null)}
            onDelete={() => handleDeleted(selectedType)}
          />
        </Card>
      )}
    </div>
  )
} 