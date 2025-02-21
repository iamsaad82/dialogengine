export interface RecordMetadata {
  id: string
  type: string
  title: string
  text?: string
  content?: string
  contentType?: string
  description?: string
  source?: string
  timestamp?: string
  templateId?: string
  language?: string
  lastModified?: string
  tags?: string[]
  url?: string
  confidence?: number
  domain?: string
  subDomain?: string
  provider?: string
  serviceType?: string
  // Serialisierte Arrays/Objekte als Strings
  images?: string  // JSON string of image array
  videos?: string  // JSON string of video array
  files?: string   // JSON string of file array
  links?: string   // JSON string of link array
  forms?: string   // JSON string of form array
  buttons?: string // JSON string of button array
  calculators?: string // JSON string of calculator array
  requirements?: string // JSON string of requirements array
  coverage?: string    // JSON string of coverage array
  nextSteps?: string   // JSON string of next steps array
  contactPoints?: string // JSON string of contact points array
  relatedTopics?: string // JSON string of related topics array
  deadlines?: string    // JSON string of deadlines array
  // Erlaubt zusätzliche dynamische Felder
  [key: string]: any
} 