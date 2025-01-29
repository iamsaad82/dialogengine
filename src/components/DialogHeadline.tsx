"use client";

import { motion } from 'framer-motion'

interface DialogHeadlineProps {
  searchTerm: string;
  description?: string;
  exampleQuestion?: string;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
  } | null;
}

export function DialogHeadline({ searchTerm, description, exampleQuestion, branding }: DialogHeadlineProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center mb-12 px-4"
    >
      <h1 className="text-2xl sm:text-3xl font-semibold mb-4" style={{ color: branding?.primaryColor || 'var(--primary)' }}>
        {searchTerm || "Wie kann ich Ihnen helfen?"}
      </h1>
      {description && (
        <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-2xl mx-auto">
          {description}
        </p>
      )}
      {exampleQuestion && (
        <p className="text-sm text-slate-500">
          Beispiel: "{exampleQuestion}"
        </p>
      )}
    </motion.div>
  )
} 