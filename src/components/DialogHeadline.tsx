"use client";

import { motion } from 'framer-motion'

type DialogHeadlineProps = {
  searchTerm?: string
  description?: string
  exampleQuestion?: string
}

export function DialogHeadline({ searchTerm, description, exampleQuestion }: DialogHeadlineProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center mb-12 px-4"
    >
      <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 mb-3">
        {searchTerm || "Wie kann ich Ihnen helfen?"}
      </h1>
      {description && (
        <p className="text-slate-600 mb-4 max-w-2xl mx-auto">
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