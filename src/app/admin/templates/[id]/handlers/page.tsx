'use client'

import { HandlerManager } from '@/components/admin/template/HandlerManager'
import { Suspense } from 'react'

interface PageProps {
  params: {
    id: string
  }
}

export default function HandlersPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div>Lade...</div>}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Handler-Verwaltung</h1>
        </div>
        
        <HandlerManager templateId={params.id} />
      </div>
    </Suspense>
  )
} 