'use client'

import TemplateManager from '@/components/admin/TemplateManager'

export default function TemplatesPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Templates</h2>
          <p className="text-muted-foreground">
            Verwalten Sie hier Ihre Chat-Templates und deren Konfigurationen.
          </p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <TemplateManager />
        </div>
      </div>
    </div>
  )
} 