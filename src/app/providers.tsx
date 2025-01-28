'use client'

import { ThemeProvider } from 'next-themes'
import { ToastProvider } from '@/components/ui/use-toast'
import React from 'react'

interface ProvidersProps {
  children: React.ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ThemeProvider>
  )
} 