'use client'

import { AnalyticsEditor } from '@/components/admin/template/AnalyticsEditor'

interface PageProps {
  params: {
    id: string
  }
}

export default function AnalyticsPage({ params }: PageProps) {
  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            Übersicht über die Nutzung und Performance des Chatbots.
          </p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <AnalyticsEditor templateId={params.id} />
        </div>
      </div>
    </div>
  )
} 