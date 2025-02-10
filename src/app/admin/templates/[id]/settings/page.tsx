'use client'

import { SettingsEditor } from '@/components/admin/template/SettingsEditor'

interface SettingsPageProps {
  params: {
    id: string
  }
}

export default function SettingsPage({ params }: SettingsPageProps) {
  return (
    <div>
      <SettingsEditor templateId={params.id} />
    </div>
  )
} 