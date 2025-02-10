'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'
import { DocumentUploader } from '@/components/ui/upload'

interface DocumentsPageProps {
  params: {
    id: string
  }
}

export default function DocumentsPage({ params }: DocumentsPageProps) {
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    setLoading(false)
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Dokumente</h3>
        <p className="text-sm text-muted-foreground">
          Laden Sie hier Markdown-Dateien und andere Dokumente hoch, die für die Wissensbasis verwendet werden sollen.
        </p>
      </div>
      <DocumentUploader 
        templateId={params.id}
        onUploadComplete={() => {
          toast({
            title: 'Erfolg',
            description: 'Dokument wurde erfolgreich hochgeladen und verarbeitet.'
          })
        }}
      />
    </div>
  )
} 