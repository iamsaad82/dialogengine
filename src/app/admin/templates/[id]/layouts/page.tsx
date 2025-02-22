'use client'

import { LayoutManager } from '@/components/admin/template/layout/LayoutManager'

interface PageProps {
  params: {
    id: string
  }
}

export default function LayoutsPage({ params }: PageProps) {
  return <LayoutManager templateId={params.id} />
} 