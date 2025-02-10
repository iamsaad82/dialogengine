'use client'

import { useEffect, useState } from 'react'
import { BrandingEditor } from '@/components/admin/template/BrandingEditor'
import { ParsedBranding } from '@/lib/types/template'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

interface BrandingPageProps {
  params: {
    id: string
  }
}

export default function BrandingPage({ params }: BrandingPageProps) {
  const [branding, setBranding] = useState<ParsedBranding | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadBranding()
  }, [params.id])

  const loadBranding = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/templates/${params.id}/branding`)
      const data = await response.json()
      setBranding(data.branding || createDefaultBranding())
    } catch (error) {
      console.error('Fehler beim Laden der Branding-Daten:', error)
      toast({
        title: 'Fehler',
        description: 'Die Branding-Daten konnten nicht geladen werden.'
      })
      setBranding(createDefaultBranding())
    } finally {
      setLoading(false)
    }
  }

  const createDefaultBranding = (): ParsedBranding => {
    return {
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      logo: '',
      font: 'Inter'
    }
  }

  const handleBrandingChange = async (updatedBranding: ParsedBranding) => {
    try {
      const response = await fetch(`/api/templates/${params.id}/branding`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ branding: updatedBranding }),
      })

      if (!response.ok) {
        throw new Error('Fehler beim Speichern')
      }

      setBranding(updatedBranding)
      toast({
        title: 'Erfolg',
        description: 'Branding-Einstellungen wurden gespeichert.'
      })
    } catch (error) {
      console.error('Fehler beim Speichern der Branding-Daten:', error)
      toast({
        title: 'Fehler',
        description: 'Die Branding-Daten konnten nicht gespeichert werden.'
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

  if (!branding) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Keine Branding-Daten verfügbar. Bitte laden Sie die Seite neu.
      </div>
    )
  }

  return (
    <div>
      <BrandingEditor 
        branding={branding} 
        onChange={handleBrandingChange}
      />
    </div>
  )
} 