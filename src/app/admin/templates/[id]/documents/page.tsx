'use client'

import { DocumentUpload } from '@/components/admin/template/content/DocumentUpload'
import { PageHeader } from '@/components/ui/page-header'

interface DocumentsPageProps {
  params: {
    id: string
  }
}

export default function DocumentsPage({ params }: DocumentsPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dokumente"
        description="Verwalten Sie hier die Dokumente für Ihren Chatbot."
      />
      
      <div className="container mx-auto py-6">
        <div className="bg-white rounded-lg border p-6">
          <DocumentUpload templateId={params.id} />
        </div>
      </div>
    </div>
  )
} 