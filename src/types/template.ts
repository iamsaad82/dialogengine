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
  metaSchema
} from '../lib/schemas/template'

export type TemplateType = z.infer<typeof templateTypeSchema>
export type IconType = z.infer<typeof iconTypeSchema>
export type Feature = z.infer<typeof featureSchema>
export type Example = z.infer<typeof exampleSchema>
export type ResponseType = z.infer<typeof responseTypeSchema>
export type ParsedContent = z.infer<typeof contentSchema>
export type ParsedBranding = z.infer<typeof brandingSchema>
export type ParsedBot = z.infer<typeof botSchema>
export type ParsedMeta = z.infer<typeof metaSchema>

export interface Template {
  id: string
  name: string
  type: TemplateType
  active: boolean
  subdomain?: string
  content: string | ParsedContent
  branding: string | ParsedBranding
  bot: string | ParsedBot
  meta: string | ParsedMeta
}

export interface DbTemplate extends Template {
  createdAt: Date
  updatedAt: Date
} 