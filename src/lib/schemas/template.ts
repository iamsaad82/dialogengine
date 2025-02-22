import { z } from 'zod'
import type { SchemaField, SchemaFieldType } from '@/lib/types/schema'

// Basic types
export const iconTypeSchema = z.enum(['zap', 'clock', 'brain', 'blocks'])
export const templateTypeSchema = z.enum(['NEUTRAL', 'CUSTOM'])
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
    subtitle: z.string(),
    description: z.string()
  }),
  showcase: z.object({
    image: z.string(),
    altText: z.string(),
    context: z.object({
      title: z.string(),
      description: z.string()
    }),
    cta: z.object({
      title: z.string(),
      question: z.string()
    })
  }),
  features: z.array(
    z.object({
      icon: z.string(),
      title: z.string(),
      description: z.string()
    })
  ),
  contact: z.object({
    title: z.string(),
    description: z.string(),
    email: z.string(),
    buttonText: z.string()
  }),
  dialog: z.object({
    title: z.string(),
    description: z.string()
  })
})

// Branding schema
export const brandingSchema = z.object({
  logo: z.string(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  backgroundColor: z.string(),
  textColor: z.string(),
  font: z.string()
})

// Smart Search schema
export const smartSearchSchema = z.object({
  provider: z.literal('openai'),
  urls: z.array(z.string()),
  excludePatterns: z.array(z.string()),
  chunkSize: z.number().min(100).max(8000),
  temperature: z.number().min(0).max(1),
  reindexInterval: z.number().min(1).max(168),
  maxTokensPerRequest: z.number().min(100).max(4000),
  maxPages: z.number().min(1).max(1000),
  useCache: z.boolean(),
  similarityThreshold: z.number().min(0).max(1),
  apiKey: z.string(),
  indexName: z.string(),
  apiEndpoint: z.string()
})

export const pineconeSchema = z.object({
  indexName: z.string(),
  namespace: z.string(),
  settings: z.object({
    dimension: z.number(),
    metric: z.enum(['cosine', 'euclidean', 'dotproduct']),
    pods: z.number(),
    replicas: z.number(),
    pod_type: z.string()
  })
})

// Bot configuration schema
export const botSchema = z.object({
  type: z.enum(['smart-search', 'flowise', 'aok-handler']),
  smartSearch: z.object({
    urls: z.array(z.string()),
    excludePatterns: z.array(z.string()),
    chunkSize: z.number(),
    temperature: z.number(),
    maxTokens: z.number(),
    systemPrompt: z.string(),
    userPrompt: z.string(),
    followupPrompt: z.string(),
    pinecone: z.object({
      indexName: z.string(),
      environment: z.string()
    })
  }).optional(),
  flowise: z.object({
    flowId: z.string(),
    apiKey: z.string()
  }).optional(),
  aokHandler: z.object({
    pineconeApiKey: z.string(),
    pineconeEnvironment: z.string(),
    pineconeIndex: z.string(),
    openaiApiKey: z.string()
  }).optional()
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

export const schemaFieldTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'date',
  'array',
  'object'
]) satisfies z.ZodType<SchemaFieldType>

// Schema-Definitionen wurden in @/lib/types/schema verschoben
export type { SchemaField, SchemaDefinition, SchemaValidationResult } from '@/lib/types/schema'

export const schemaFieldSchema: z.ZodType<SchemaField> = z.lazy(() => z.object({
  name: z.string(),
  type: schemaFieldTypeSchema,
  description: z.string().optional(),
  required: z.boolean().default(false),
  isArray: z.boolean().default(false),
  properties: z.array(z.lazy(() => schemaFieldSchema)).optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    enum: z.array(z.string()).optional()
  }).optional()
}).strict())

export interface Handler {
  type: string
  active: boolean
  metadata: {
    keyTopics: string[]
    [key: string]: any
  }
  responses: Array<{
    type: string
    content: string
  }>
  settings: {
    matchThreshold: number
    contextWindow: number
    [key: string]: any
  }
}

const handlerSchema = z.object({
  type: z.string(),
  active: z.boolean(),
  metadata: z.object({
    keyTopics: z.array(z.string()),
  }).catchall(z.any()),
  responses: z.array(z.object({
    type: z.string(),
    content: z.string()
  })),
  settings: z.object({
    matchThreshold: z.number(),
    contextWindow: z.number()
  }).catchall(z.any())
})

export const extractionSchemaSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.number().default(1),
  fields: z.array(schemaFieldSchema),
  handlers: z.array(handlerSchema),
  createdAt: z.date(),
  updatedAt: z.date()
})

export type ExtractionSchema = z.infer<typeof extractionSchemaSchema> 