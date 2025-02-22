'use client'

import { DocumentTypeManager } from '@/components/admin/template/document/DocumentTypeManager'

interface PageProps {
  params: {
    id: string
  }
}

export default function DocumentTypesPage({ params }: PageProps) {
  return <DocumentTypeManager templateId={params.id} />
} 