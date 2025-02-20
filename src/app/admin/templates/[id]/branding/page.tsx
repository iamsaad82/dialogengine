'use client'

import { useEffect, useState } from 'react'
import { BrandingEditor } from '@/components/admin/template/BrandingEditor'
import { BrandingConfig } from '@/lib/types/template'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

interface BrandingPageProps {
  params: {
    id: string
  }
}

export default function BrandingPage({ params }: BrandingPageProps) {
  const [branding, setBranding] = useState<BrandingConfig>({
    logo: '',
    colors: {
      primary: '#000000',
      secondary: '#666666',
      accent: '#CCCCCC'
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter'
    }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadBranding()
  }, [params.id])

  const loadBranding = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/templates/${params.id}`)
      
      if (!response.ok) {
        throw new Error('Fehler beim Laden des Brandings')
      }
      
      const data = await response.json()
      setBranding(data.branding || {
        logo: '',
        colors: {
          primary: '#000000',
          secondary: '#666666',
          accent: '#CCCCCC'
        },
        fonts: {
          heading: 'Inter',
          body: 'Inter'
        }
      })
    } catch (error) {
      console.error('Fehler beim Laden des Brandings:', error)
      toast({
        title: 'Fehler',
        description: 'Das Branding konnte nicht geladen werden.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBrandingChange = async (updatedBranding: BrandingConfig) => {
    try {
      setSaving(true)
      
      // Hole zuerst das aktuelle Template
      const getResponse = await fetch(`/api/templates/${params.id}`)
      const currentTemplate = await getResponse.json()
      
      if (!getResponse.ok) {
        throw new Error('Fehler beim Laden des Templates')
      }

      // Bereite die Update-Daten vor
      const updateData = {
        ...currentTemplate,
        branding: updatedBranding
      }

      // Sende Update-Request
      const response = await fetch(`/api/templates/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })
      
      if (!response.ok) {
        throw new Error('Fehler beim Speichern des Brandings')
      }
      
      setBranding(updatedBranding)
      toast({
        title: 'Erfolg',
        description: 'Das Branding wurde gespeichert.'
      })
    } catch (error) {
      console.error('Fehler beim Speichern des Brandings:', error)
      toast({
        title: 'Fehler',
        description: 'Das Branding konnte nicht gespeichert werden.'
      })
    } finally {
      setSaving(false)
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
        title="Branding"
        description="Passen Sie das Erscheinungsbild Ihres Templates an."
      />
      
      <div className="container mx-auto py-6">
        <div className="bg-white rounded-lg border p-6">
          <BrandingEditor
            branding={branding}
            onChange={handleBrandingChange}
            saving={saving}
          />
        </div>
      </div>
    </div>
  )
} 