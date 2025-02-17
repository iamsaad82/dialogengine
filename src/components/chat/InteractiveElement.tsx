'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { ExternalLink, ChevronRight } from 'lucide-react'

export interface InteractiveElementProps {
  type: 'button' | 'input' | 'suggestion' | 'link' | 'media'
  text: string
  action: string
  url?: string
  branding: {
    primaryColor: string
    secondaryColor: string
    backgroundColor: string
    textColor: string
  }
  onInteraction: (action: string, value?: string) => void
}

export function InteractiveElement({
  type,
  text,
  action,
  url,
  branding,
  onInteraction
}: InteractiveElementProps) {
  const [inputValue, setInputValue] = useState('')
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = () => {
    if (type === 'input') {
      onInteraction(action, inputValue)
      setInputValue('')
    } else {
      onInteraction(action)
    }
  }

  const getElement = () => {
    switch (type) {
      case 'button':
        return (
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-lg px-4 py-2 font-medium shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-2 backdrop-blur-sm"
            style={{
              background: `linear-gradient(135deg, ${branding.primaryColor}dd, ${branding.secondaryColor || branding.primaryColor}dd)`,
              color: '#ffffff',
            }}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {text}
            <motion.span
              animate={{ x: isHovered ? 5 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="w-4 h-4 opacity-75" />
            </motion.span>
          </motion.button>
        )

      case 'input':
        return (
          <div className="flex w-full max-w-sm items-center space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 text-sm transition-all duration-300",
                "focus:ring-2 focus:ring-offset-1 outline-none",
                "bg-white/80 backdrop-blur-sm",
                "placeholder:text-gray-400"
              )}
              style={{
                borderColor: `${branding.primaryColor}20`,
                '--tw-ring-color': `${branding.primaryColor}40`,
                color: branding.textColor,
              } as React.CSSProperties}
              placeholder={text}
              onKeyPress={(e) => e.key === 'Enter' && handleClick()}
            />
            <Button
              onClick={handleClick}
              className="shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-sm"
              style={{
                background: `linear-gradient(135deg, ${branding.primaryColor}dd, ${branding.secondaryColor || branding.primaryColor}dd)`,
                color: '#ffffff',
              }}
            >
              Senden
            </Button>
          </div>
        )

      case 'suggestion':
        return (
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-full px-4 py-1.5 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-2 bg-white/80 backdrop-blur-sm"
            style={{
              border: `1.5px solid ${branding.primaryColor}20`,
              color: branding.primaryColor,
            }}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {text}
            <motion.span
              animate={{ 
                x: isHovered ? 5 : 0,
                opacity: isHovered ? 1 : 0,
                scale: isHovered ? 1 : 0.8
              }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </motion.span>
          </motion.button>
        )

      case 'link':
        return (
          <motion.a
            whileHover={{ 
              scale: 1.02,
              y: -1,
              color: branding.secondaryColor || branding.primaryColor
            }}
            className={cn(
              "inline-flex items-center gap-2 font-medium transition-all duration-300",
              "hover:underline decoration-2 underline-offset-4"
            )}
            style={{
              color: branding.primaryColor
            }}
            href={url || action}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {text}
            <motion.span
              animate={{ 
                x: isHovered ? 5 : 0,
                rotate: isHovered ? 45 : 0,
                scale: isHovered ? 1.1 : 1
              }}
              transition={{ duration: 0.2 }}
            >
              <ExternalLink className="w-3.5 h-3.5 opacity-75" />
            </motion.span>
          </motion.a>
        )

      case 'media':
        return (
          <motion.div 
            className="relative mt-2 overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-all duration-300 bg-white/80 backdrop-blur-sm"
            whileHover={{ scale: 1.02, y: -1 }}
            style={{ maxWidth: '300px' }}
          >
            {action.endsWith('.mp4') || action.endsWith('.webm') ? (
              <video 
                src={action}
                controls
                className="w-full"
                style={{ maxHeight: '200px' }}
              >
                {text}
              </video>
            ) : (
              <img 
                src={action} 
                alt={text}
                className="w-full object-cover"
                style={{ maxHeight: '200px' }}
              />
            )}
          </motion.div>
        )

      default:
        return null
    }
  }

  return getElement()
} 