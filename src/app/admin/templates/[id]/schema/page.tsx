'use client'

import { useEffect, useState } from 'react'
import { SchemaEditor } from '@/components/admin/template/schema/SchemaEditor'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import type { ExtractionSchema } from '@/lib/types/schema'

interface SchemaPageProps {
  params: {
    id: string
  }
}

export default function SchemaPage({ params }: SchemaPageProps) {
  const [schema, setSchema] = useState<ExtractionSchema | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadSchema()
  }, [params.id])

  const loadSchema = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/templates/${params.id}/schema`)
      
      if (!response.ok) {
        throw new Error('Fehler beim Laden des Schemas')
      }
      
      const data = await response.json()
      setSchema(data || createDefaultSchema())
    } catch (error) {
      console.error('Fehler beim Laden des Schemas:', error)
      toast({
        title: 'Fehler',
        description: 'Das Schema konnte nicht geladen werden.'
      })
      setSchema(createDefaultSchema())
    } finally {
      setLoading(false)
    }
  }

  const createDefaultSchema = (): ExtractionSchema => ({
    id: '',
    templateId: params.id,
    name: 'Neues Schema',
    description: '',
    version: 1,
    fields: {
      patterns: [],
      metadata: [],
      responseTypes: [],
      version: 1,
      settings: {}
    },
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  })

  const handleUpdate = async (updatedSchema: ExtractionSchema) => {
    try {
      const response = await fetch(`/api/templates/${params.id}/schema`, {
        method: updatedSchema.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSchema),
      })
      
      if (!response.ok) {
        throw new Error('Fehler beim Speichern des Schemas')
      }
      
      const savedSchema = await response.json()
      setSchema(savedSchema)
      toast({
        title: 'Erfolg',
        description: 'Das Schema wurde gespeichert.'
      })
    } catch (error) {
      console.error('Fehler beim Speichern des Schemas:', error)
      toast({
        title: 'Fehler',
        description: 'Das Schema konnte nicht gespeichert werden.'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!schema) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Schema nicht gefunden
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Extraktionsschema"
        description="Definieren Sie hier, wie Informationen aus Dokumenten extrahiert werden sollen."
      />
      
      <div className="container mx-auto py-6">
        <div className="bg-white rounded-lg border p-6">
          <SchemaEditor 
            templateId={params.id}
            schema={schema}
            onUpdate={handleUpdate}
          />
        </div>
      </div>
    </div>
  )
} 