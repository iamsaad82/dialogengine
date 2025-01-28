import { z } from 'zod'
import {
  templateTypeSchema,
  iconTypeSchema,
  featureSchema,
  exampleSchema,
  responseTypeSchema,
  contentSchema,
  brandingSchema,
  botSchema,
  metaSchema,
  templateSchema
} from '../schemas/template'

export type Template = {
  id: string
  name: string
  type: z.infer<typeof templateTypeSchema>
  active: boolean
  subdomain: string | null
  jsonContent: string | any
  jsonBranding: string | any
  jsonBot: string | any
  jsonMeta: string | any
  createdAt: Date
  updatedAt: Date
  flowiseConfig?: any
  flowiseConfigId?: string
}

export type ParsedTemplate = {
  id: string
  name: string
  type: z.infer<typeof templateTypeSchema>
  active: boolean
  subdomain: string | null
  jsonContent: any
  jsonBranding: any
  jsonBot: any
  jsonMeta: any
  createdAt: Date
  updatedAt: Date
  flowiseConfig?: any
  flowiseConfigId?: string
}

export type DbTemplate = Template

export type IconType = z.infer<typeof iconTypeSchema>
export type Feature = z.infer<typeof featureSchema>
export type Example = z.infer<typeof exampleSchema>
export type ResponseType = z.infer<typeof responseTypeSchema>
export interface ParsedContent {
  hero: {
    title: string;
    subtitle: string;
    description: string;
  };
  dialog?: {
    title: string;
    description: string;
  };
  showcase: {
    image: string;
    altText: string;
    context: {
      title: string;
      description: string;
    };
    cta: {
      title: string;
      question: string;
    };
  };
  features: {
    title: string;
    description: string;
    icon: string;
  }[];
  contact: {
    title: string;
    description: string;
    email: string;
    buttonText: string;
  };
}
export type ParsedBranding = z.infer<typeof brandingSchema>
export interface ParsedBot {
  type: 'examples' | 'flowise' | 'smart-search';
  examples?: Example[];
  flowiseId?: string;
  smartSearch?: {
    apiEndpoint: string;
    indexName: string;
    apiKey?: string;
  };
}
export type ParsedMeta = z.infer<typeof metaSchema> 