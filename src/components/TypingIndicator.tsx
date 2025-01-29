"use client"

import { useState, useEffect } from 'react'
import { Bot, Sparkles, Brain, Lightbulb } from 'lucide-react'
import { motion } from 'framer-motion'

const thinkingMessages = [
  { text: "Ich denke nach...", icon: Brain },
  { text: "Einen Moment bitte...", icon: null },
  { text: "Ich analysiere die Informationen...", icon: Sparkles },
  { text: "Gleich hab ich's...", icon: null },
  { text: "Ich formuliere eine Antwort...", icon: Lightbulb },
  { text: "Fast fertig...", icon: null },
]

const gradientColors = [
  'from-indigo-500 to-purple-500',
  'from-blue-500 to-indigo-500',
  'from-purple-500 to-pink-500',
  'from-pink-500 to-rose-500',
]

interface TypingIndicatorProps {
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
  } | null;
}

export default function TypingIndicator({ branding }: TypingIndicatorProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [gradientIndex, setGradientIndex] = useState(0)
  const currentMessage = thinkingMessages[messageIndex]
  const Icon = currentMessage.icon

  useEffect(() => {
    const messageTimer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % thinkingMessages.length)
    }, 3000)

    const gradientTimer = setInterval(() => {
      setGradientIndex((prev) => (prev + 1) % gradientColors.length)
    }, 2000)

    return () => {
      clearInterval(messageTimer)
      clearInterval(gradientTimer)
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="bg-white/80 backdrop-blur-sm border-2 border-slate-200/50 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-4 relative overflow-hidden group">
        {/* Hintergrund-Gradient-Animation */}
        <motion.div 
          className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "linear"
          }}
        />

        <div className="flex items-center gap-3 relative">
          <motion.p
            key={messageIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-[15px] text-slate-600 flex items-center gap-2"
          >
            {Icon && (
              <motion.span
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 0.9, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Icon 
                  className="h-4 w-4" 
                  style={{ color: branding?.primaryColor || 'var(--primary)' }}
                />
              </motion.span>
            )}
            {currentMessage.text}
          </motion.p>

          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: branding?.primaryColor || 'var(--primary)' }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.4, 1, 0.4]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        </div>

        {/* Glowing Effekt */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-xl"
          animate={{
            opacity: [0, 0.5, 0],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
    </motion.div>
  )
} 