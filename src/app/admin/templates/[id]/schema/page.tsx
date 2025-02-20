'use client'

import { useEffect, useState } from 'react'
import { SchemaEditor } from '@/components/admin/template/schema/SchemaEditor'
import type { ExtractionSchema, ExtractionSchemaFields } from '@/lib/types/schema'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'

interface SchemaPageProps {
  params: {
    id: string
  }
}

const defaultSchema: ExtractionSchemaFields = {
  name: '',
  patterns: [],
  metadata: [],
  version: 1,
  settings: {},
  responseTypes: []
}

export default function SchemaPage({ params }: SchemaPageProps) {
  const [schema, setSchema] = useState<ExtractionSchemaFields>(defaultSchema)
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
        if (response.status === 404) {
          // Wenn kein Schema gefunden wurde, verwenden wir das Standard-Schema
          setSchema(defaultSchema)
          return
        }
        throw new Error('Fehler beim Laden des Schemas')
      }
      
      const data = await response.json()
      setSchema(data.fields || defaultSchema)
    } catch (error) {
      console.error('Fehler beim Laden des Schemas:', error)
      toast({
        title: 'Fehler',
        description: 'Das Schema konnte nicht geladen werden.'
      })
      setSchema(defaultSchema)
    } finally {
      setLoading(false)
    }
  }

  const handleSchemaChange = async (updatedFields: ExtractionSchemaFields) => {
    try {
      const updatedSchema = {
        templateId: params.id,
        name: updatedFields.name || 'Extraktionsschema',
        description: 'Automatisch generiertes Schema',
        fields: updatedFields,
        version: updatedFields.version
      }

      const response = await fetch(`/api/templates/${params.id}/schema`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSchema),
      })
      
      if (!response.ok) {
        throw new Error('Fehler beim Speichern des Schemas')
      }
      
      setSchema(updatedFields)
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schema"
        description="Definieren Sie das Extraktionsschema für Ihr Template."
      />
      
      <div className="container mx-auto py-6">
        <div className="bg-white rounded-lg border p-6">
          <SchemaEditor
            templateId={params.id}
            schema={schema}
            onChange={handleSchemaChange}
          />
        </div>
      </div>
    </div>
  )
} 