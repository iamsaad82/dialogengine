'use client'

import { useEffect, useState } from 'react'
import ContentTypeManager from "@/components/admin/ContentTypeManager"
import { useRouter } from 'next/navigation'
import { useToast } from "@/components/ui/use-toast"

interface ContentTypesPageProps {
  params: {
    id: string
  }
}

export default function ContentTypesPage({ params }: ContentTypesPageProps) {
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const validateTemplate = async () => {
      try {
        const response = await fetch(`/api/templates/${params.id}/validate`)
        if (!response.ok) {
          if (response.status === 404) {
            router.push('/404')
            return
          }
          throw new Error('Fehler beim Laden des Templates')
        }
      } catch (error) {
        console.error('Fehler:', error)
        toast({
          title: 'Fehler',
          description: 'Das Template konnte nicht geladen werden.'
        })
      } finally {
        setLoading(false)
      }
    }

    validateTemplate()
  }, [params.id, router, toast])

  if (loading) {
    return <div>Lädt...</div>
  }

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Inhaltstypen</h1>
        <p className="text-muted-foreground">
          Hier können Sie die verschiedenen Inhaltstypen für Ihre Vorlage konfigurieren.
        </p>
      </div>
      <ContentTypeManager templateId={params.id} />
    </div>
  )
} 