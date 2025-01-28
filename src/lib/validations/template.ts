import { z } from 'zod'

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['NEUTRAL', 'INDUSTRY', 'CUSTOM']),
  active: z.boolean().default(true),
  subdomain: z.string().min(1).max(255).optional(),
  jsonContent: z.any(),
  jsonBranding: z.any(),
  jsonBot: z.any(),
  jsonMeta: z.any(),
  flowiseConfigId: z.string().optional()
})

export const updateTemplateSchema = createTemplateSchema.extend({
  id: z.string().min(1)
})

export type CreateTemplate = z.infer<typeof createTemplateSchema>
export type UpdateTemplate = z.infer<typeof updateTemplateSchema> 