import { ContentTypeRegistry, ContentTypeDefinition, BaseContentType, DocumentPattern } from '@/lib/types/contentTypes'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

type ContentTypeWithJson = {
  id: string
  type: string
  name: string | null
  description: string | null
  metadata: Prisma.JsonValue
  patterns: Prisma.JsonValue
  validators: Prisma.JsonValue
  templateId: string
  createdAt: Date
  updatedAt: Date
}

type ContentTypeValidator = (content: string) => Promise<boolean>

/**
 * Implementierung der ContentTypeRegistry für die dynamische Verwaltung von Content-Types
 */
export class ContentTypeRegistryImpl implements ContentTypeRegistry {
  private types: Map<string, ContentTypeDefinition> = new Map()
  private templateId: string

  constructor(templateId: string) {
    this.templateId = templateId
    this.loadFromDatabase()
  }

  private async loadFromDatabase() {
    try {
      const types = await prisma.$queryRaw<ContentTypeWithJson[]>`
        SELECT * FROM content_types WHERE "templateId" = ${this.templateId}
      `

      types.forEach((type: ContentTypeWithJson) => {
        const metadata = type.metadata as Record<string, unknown>
        const patterns = (type.patterns as Array<unknown>).map(p => p as DocumentPattern)
        const validators = (type.validators as Array<unknown>).map(v => {
          const validatorFn = new Function('content', v as string) as ContentTypeValidator
          return validatorFn
        })

        this.types.set(type.id, {
          id: type.id,
          type: type.type as BaseContentType,
          name: type.name || `${type.type}-${type.id}`,
          description: type.description || undefined,
          metadata: {
            title: type.name || undefined,
            description: type.description || undefined,
            ...metadata
          },
          patterns,
          validators,
          validation: {
            patterns: [],
            required: [],
            rules: []
          }
        })
      })
    } catch (error) {
      console.error('Fehler beim Laden der Content-Types:', error)
    }
  }

  async register(definition: ContentTypeDefinition): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO content_types (
          id, type, name, description, metadata, patterns, validators, "templateId", "createdAt", "updatedAt"
        ) VALUES (
          ${definition.id},
          ${definition.type},
          ${definition.name},
          ${definition.description},
          ${JSON.stringify(definition.metadata)}::jsonb,
          ${JSON.stringify(definition.patterns)}::jsonb,
          ${JSON.stringify(definition.validators)}::jsonb,
          ${this.templateId},
          NOW(),
          NOW()
        )
      `

      this.types.set(definition.id, definition)
    } catch (error) {
      console.error('Fehler beim Registrieren des Content-Types:', error)
      throw error
    }
  }

  async get(id: string): Promise<ContentTypeDefinition | undefined> {
    return this.types.get(id)
  }

  async list(): Promise<ContentTypeDefinition[]> {
    return Array.from(this.types.values())
  }

  async update(id: string, definition: Partial<ContentTypeDefinition>): Promise<void> {
    try {
      const existing = this.types.get(id)
      if (!existing) {
        throw new Error('Content-Type nicht gefunden')
      }

      const updated = {
        ...existing,
        ...definition
      }

      await prisma.$executeRaw`
        UPDATE content_types
        SET
          type = ${updated.type},
          name = ${updated.name},
          description = ${updated.description},
          metadata = ${JSON.stringify(updated.metadata)}::jsonb,
          patterns = ${JSON.stringify(updated.patterns)}::jsonb,
          validators = ${JSON.stringify(updated.validators)}::jsonb,
          "updatedAt" = NOW()
        WHERE id = ${id}
      `

      this.types.set(id, updated)
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Content-Types:', error)
      throw error
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await prisma.$executeRaw`
        DELETE FROM content_types WHERE id = ${id}
      `

      this.types.delete(id)
    } catch (error) {
      console.error('Fehler beim Löschen des Content-Types:', error)
      throw error
    }
  }

  async validateContent(content: string, typeId: string): Promise<boolean> {
    const type = this.types.get(typeId)
    if (!type) return false

    // Prüfe Patterns
    if (type.patterns) {
      const matches = type.patterns.some(pattern => {
        if (typeof pattern === 'string') {
          return content.includes(pattern)
        }
        if (pattern instanceof RegExp) {
          return pattern.test(content)
        }
        return false
      })
      if (!matches) return false
    }

    // Prüfe Validators
    if (type.validators) {
      for (const validator of type.validators) {
        try {
          if (!await validator(content)) {
            return false
          }
        } catch (error) {
          console.error('Validator-Fehler:', error)
          return false
        }
      }
    }

    return true
  }
} 