import { z } from 'zod'

// Basic types
export const iconTypeSchema = z.enum(['zap', 'clock', 'brain', 'blocks'])
export const templateTypeSchema = z.enum(['NEUTRAL', 'INDUSTRY', 'CUSTOM'])
export const responseTypeSchema = z.enum([
  'info',
  'service',
  'link',
  'contact',
  'product',
  'location',
  'faq',
  'event',
  'download',
  'video'
])

// Feature schema
export const featureSchema = z.object({
  icon: z.string().min(1),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500)
})

// Hero schema
export const heroSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(300),
  description: z.string().max(500)
})

// Showcase schema
export const showcaseSchema = z.object({
  image: z.string().url(),
  altText: z.string().max(200),
  context: z.object({
    title: z.string().max(200),
    description: z.string().max(500)
  }),
  cta: z.object({
    title: z.string().max(200),
    question: z.string().max(500)
  })
})

export const featuresSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(300),
  items: z.array(featureSchema)
})

// Call to Action schema
export const callToActionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(300),
  primaryButton: z.object({
    text: z.string().min(1).max(50),
    url: z.string().url()
  })
})

// Contact schema
export const contactSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(300),
  email: z.string().email(),
  buttonText: z.string().min(1).max(50)
})

// Metadata schemas
export const metadataSchema = z.object({
  url: z.string().url().optional(),
  image: z.string().url().optional(),
  price: z.string().optional(),
  date: z.string().datetime().optional(),
  address: z.string().optional(),
  buttonText: z.string().max(50).optional(),
  videoUrl: z.string().url().optional()
})

export const ExampleMetadataSchema = z.object({
  url: z.string().optional(),
  image: z.string().optional(),
  price: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  sessions: z.string().optional(),
  available: z.boolean().optional(),
  address: z.string().optional(),
  buttonText: z.string().optional(),
  videoUrl: z.string().optional(),
  fileSize: z.string().optional(),
  fileType: z.string().optional(),
  relatedQuestions: z.string().optional(),
  title: z.string().optional()
})

// Example schema
export const exampleSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['info', 'service', 'link', 'contact', 'product', 'location', 'faq', 'event', 'download', 'video']),
  question: z.string(),
  answer: z.string(),
  context: z.string(),
  metadata: z.object({
    url: z.string().optional(),
    buttonText: z.string().optional(),
    image: z.string().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    sessions: z.string().optional(),
    available: z.union([z.boolean(), z.string()]).optional(),
    title: z.string().optional(),
    address: z.string().optional(),
    price: z.string().optional(),
    fileType: z.string().optional(),
    fileSize: z.string().optional(),
    videoUrl: z.string().optional(),
    relatedQuestions: z.string().optional()
  })
})

// Main content schema
export const contentSchema = z.object({
  hero: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string(),
    altText: z.string()
  }).optional(),
  showcase: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string(),
    altText: z.string(),
    context: z.string(),
    cta: z.object({
      text: z.string(),
      url: z.string()
    })
  }).optional(),
  features: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      icon: z.string()
    })
  ).optional(),
  contact: z.object({
    title: z.string(),
    description: z.string(),
    email: z.string(),
    buttonText: z.string()
  }).optional(),
  dialog: z.object({
    title: z.string(),
    description: z.string()
  }).optional()
})

// Branding schema
export const brandingSchema = z.object({
  logo: z.string().url(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i)
})

// Smart Search schema
export const smartSearchSchema = z.object({
  provider: z.literal('openai'),
  apiKey: z.string().optional(),
  urls: z.array(z.string()),
  excludePatterns: z.array(z.string()),
  chunkSize: z.number().min(100).max(1000),
  temperature: z.number().min(0).max(1),
  indexName: z.string().optional(),
  apiEndpoint: z.string().optional(),
  reindexInterval: z.number().min(1).max(168),
  maxTokensPerRequest: z.number().min(100).max(2000),
  useCache: z.boolean(),
  similarityThreshold: z.number().min(0).max(1)
}).partial().extend({
  provider: z.literal('openai'),
  urls: z.array(z.string()).default([]),
  excludePatterns: z.array(z.string()).default(['/admin/*', '/wp-*', '*.pdf', '/wp-json/*', '/api/*']),
  chunkSize: z.number().min(100).max(1000).default(300),
  temperature: z.number().min(0).max(1).default(0.1),
  reindexInterval: z.number().min(1).max(168).default(24),
  maxTokensPerRequest: z.number().min(100).max(2000).default(500),
  useCache: z.boolean().default(true),
  similarityThreshold: z.number().min(0).max(1).default(0.8)
})

// Bot configuration schema
export const botSchema = z.object({
  type: z.enum(['examples', 'flowise', 'smart-search']),
  examples: z.array(exampleSchema).default([]),
  flowiseId: z.string().optional(),
  templateId: z.string().optional(),
  smartSearch: smartSearchSchema.optional()
})

// Meta schema
export const metaSchema = z.object({
  title: z.string(),
  description: z.string(),
  domain: z.string().optional(),
  contactUrl: z.string().optional(),
  servicesUrl: z.string().optional()
})

// Complete template schema
export const templateSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['NEUTRAL', 'CUSTOM']),
  active: z.boolean(),
  subdomain: z.string(),
  jsonContent: z.string(),
  jsonBranding: z.string(),
  jsonBot: z.string(),
  jsonMeta: z.string(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string())
})

// Types generated from schemas
export type IconType = z.infer<typeof iconTypeSchema>
export type TemplateType = z.infer<typeof templateTypeSchema>
export type ResponseType = z.infer<typeof responseTypeSchema>
export type Feature = z.infer<typeof featureSchema>
export type Example = z.infer<typeof exampleSchema>
export type Template = {
  id: string
  name: string
  type: 'NEUTRAL' | 'CUSTOM'
  active: boolean
  subdomain: string
  jsonContent: string
  jsonBranding: string
  jsonBot: string
  jsonMeta: string
  createdAt: string | Date
  updatedAt: string | Date
}
export type ParsedContent = {
  hero?: {
    title: string
    description: string
    image: string
    altText: string
  }
  showcase?: {
    title: string
    description: string
    image: string
    altText: string
    context: string
    cta: {
      text: string
      url: string
    }
  }
  features?: {
    title: string
    description: string
    icon: string
  }[]
  contact?: {
    title: string
    description: string
    email: string
    buttonText: string
  }
  dialog?: {
    title: string
    description: string
  }
}
export type ParsedBranding = z.infer<typeof brandingSchema>
export type ParsedBot = z.infer<typeof botSchema>
export type ParsedMeta = z.infer<typeof metaSchema> 