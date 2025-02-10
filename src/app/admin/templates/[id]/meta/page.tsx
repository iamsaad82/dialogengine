'use client'

import { useEffect, useState } from 'react'
import { MetadataEditor } from '@/components/admin/template/MetadataEditor'
import { ParsedMeta } from '@/lib/types/template'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

interface MetaPageProps {
  params: {
    id: string
  }
}

export default function MetaPage({ params }: MetaPageProps) {
  const [meta, setMeta] = useState<ParsedMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadMeta()
  }, [params.id])

  const loadMeta = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/templates/${params.id}/meta`)
      const data = await response.json()
      setMeta(data.meta || createDefaultMeta())
    } catch (error) {
      console.error('Fehler beim Laden der Metadaten:', error)
      toast({
        title: 'Fehler',
        description: 'Die Metadaten konnten nicht geladen werden.'
      })
      setMeta(createDefaultMeta())
    } finally {
      setLoading(false)
    }
  }

  const createDefaultMeta = (): ParsedMeta => {
    return {
      title: '',
      description: '',
      domain: '',
      contactUrl: '/kontakt',
      servicesUrl: '/leistungen'
    }
  }

  const handleMetaChange = async (updatedMeta: ParsedMeta) => {
    try {
      const response = await fetch(`/api/templates/${params.id}/meta`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meta: updatedMeta }),
      })

      if (!response.ok) {
        throw new Error('Fehler beim Speichern')
      }

      setMeta(updatedMeta)
      toast({
        title: 'Erfolg',
        description: 'Metadaten wurden gespeichert.'
      })
    } catch (error) {
      console.error('Fehler beim Speichern der Metadaten:', error)
      toast({
        title: 'Fehler',
        description: 'Die Metadaten konnten nicht gespeichert werden.'
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

  if (!meta) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Keine Metadaten verfügbar. Bitte laden Sie die Seite neu.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Metadaten</h3>
        <p className="text-sm text-muted-foreground">
          Verwalten Sie hier die Metadaten Ihres Templates.
        </p>
      </div>
      <MetadataEditor 
        meta={meta}
        onChange={handleMetaChange}
      />
    </div>
  )
} 