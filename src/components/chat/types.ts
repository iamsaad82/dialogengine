import { ReactElement, RefObject } from 'react'

export interface Message {
  role: 'user' | 'assistant'
  content: string | ReactElement
}

export interface ChatResponse {
  type: 'info' | 'service' | 'product' | 'event' | 'location' | 'video' | 'link' | 'contact' | 'faq' | 'download' | 'medical' | 'insurance'
  title?: string
  text: string
  metadata?: {
    url?: string
    buttonText?: string
    image?: string
    date?: string
    time?: string
    sessions?: string
    available?: boolean
    address?: string
    price?: string
    fileType?: string
    fileSize?: string
    videoUrl?: string
    relatedQuestions?: string[]
    nextSteps?: string[]
    sources?: Array<{
      url: string
      title: string
      snippets?: Array<{
        text: string
        score: number
      }>
    }>
    // AOK-spezifische Metadaten
    regions?: string[]
    requirements?: string[]
    costs?: string
    coverage?: {
      included?: string[]
      excluded?: string[]
      conditions?: string[]
    }
    contactPoints?: Array<{
      type: string
      value: string
      description?: string
    }>
    treatment?: {
      duration?: string
      sessions?: number
      procedure?: string[]
    }
    validity?: {
      startDate?: string
      endDate?: string
      repeatable?: boolean
      waitingPeriod?: string
    }
  }
}

export interface ChatInputProps {
  input: string
  setInput: (value: string) => void
  handleSubmit: (e: React.FormEvent) => void
  isFocused: boolean
  setIsFocused: (value: boolean) => void
  isTyping: boolean
  inputRef: RefObject<HTMLInputElement | null>
  branding: any
} 