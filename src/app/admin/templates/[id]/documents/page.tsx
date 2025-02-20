'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { DocumentManager } from '@/components/admin/template/DocumentManager'

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
      <PageHeader
        title="Dokumente"
        description="Verwalten Sie hier die Dokumente für die Wissensbasis Ihres Chatbots."
      />
      
      <div className="container mx-auto py-6">
        <div className="bg-white rounded-lg border p-6">
          <DocumentManager templateId={params.id} />
        </div>
      </div>
    </div>
  )
} 