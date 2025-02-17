import React from 'react'

interface CodeProps {
  children: React.ReactNode
  className?: string
}

export function Code({ children, className = '' }: CodeProps) {
  return (
    <pre className={`bg-gray-100 p-4 rounded-lg overflow-x-auto ${className}`}>
      <code>{children}</code>
    </pre>
  )
} 