"use client"

import React from 'react'
import TemplateManager from '@/components/admin/TemplateManager'

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="py-10">
        <header>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">
              Admin Dashboard
            </h1>
          </div>
        </header>
        <main>
          <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="px-4 py-8 sm:px-0">
              <TemplateManager />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
} 