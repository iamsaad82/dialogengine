import React from 'react'

interface TextProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'muted' | 'error'
}

export function Text({ children, className = '', variant = 'default' }: TextProps) {
  const variantClasses = {
    default: 'text-gray-900',
    muted: 'text-gray-500',
    error: 'text-red-500'
  }

  return (
    <p className={`${variantClasses[variant]} ${className}`}>
      {children}
    </p>
  )
} 