import { Logger } from '@/lib/utils/logger'
import { prisma, testConnection } from '@/lib/prisma'
import type { 
  ContentTypeRegistry, 
  ContentTypeDefinition,
  DocumentPattern
} from '@/lib/types/contentTypes'
import { Prisma } from '@prisma/client'

export class ContentTypeRegistryService implements ContentTypeRegistry {
  private logger: Logger

  constructor() {
    this.logger = new Logger('ContentTypeRegistry')
  }

  private async ensureConnection() {
    try {
      await testConnection()
    } catch (error) {
      this.logger.error('Datenbankverbindung fehlgeschlagen:', error instanceof Error ? error : new Error('Unbekannter Fehler'))
      throw error instanceof Error ? error : new Error('Datenbankverbindung fehlgeschlagen')
    }
  }

  async register(definition: ContentTypeDefinition): Promise<void> {
    try {
      await this.ensureConnection()

      const data = {
        type: definition.type,
        name: definition.name,
        description: definition.description,
        metadata: definition.metadata as unknown as Prisma.InputJsonValue,
        patterns: definition.patterns as unknown as Prisma.InputJsonValue,
        validation: definition.validation as unknown as Prisma.InputJsonValue,
        responseConfig: {} as Prisma.InputJsonValue,
        template: {
          connect: {
            id: definition.templateId || 'default'
          }
        }
      }

      await prisma.documentType.upsert({
        where: { id: definition.id },
        update: data,
        create: {
          id: definition.id,
          ...data
        }
      })
      this.logger.info(`Content-Type ${definition.id} registriert`)
    } catch (error) {
      this.logger.error('Fehler bei der Registrierung:', error instanceof Error ? error : new Error('Unbekannter Fehler'))
      throw error
    }
  }

  async get(id: string): Promise<ContentTypeDefinition | undefined> {
    try {
      await this.ensureConnection()

      const docType = await prisma.documentType.findUnique({
        where: { id }
      })
      
      if (!docType) return undefined

      return {
        id: docType.id,
        type: docType.type as ContentTypeDefinition['type'],
        name: docType.name,
        description: docType.description || undefined,
        metadata: docType.metadata as unknown as ContentTypeDefinition['metadata'],
        patterns: docType.patterns as unknown as DocumentPattern[],
        validation: docType.validation as unknown as ContentTypeDefinition['validation'],
        validators: [],  // Runtime validators werden nicht in der DB gespeichert
        templateId: docType.templateId
      }
    } catch (error) {
      this.logger.error('Fehler beim Laden:', error instanceof Error ? error : new Error('Unbekannter Fehler'))
      return undefined
    }
  }

  async list(): Promise<ContentTypeDefinition[]> {
    try {
      await this.ensureConnection()

      const docTypes = await prisma.documentType.findMany()
      return docTypes.map(dt => ({
        id: dt.id,
        type: dt.type as ContentTypeDefinition['type'],
        name: dt.name,
        description: dt.description || undefined,
        metadata: dt.metadata as unknown as ContentTypeDefinition['metadata'],
        patterns: dt.patterns as unknown as DocumentPattern[],
        validation: dt.validation as unknown as ContentTypeDefinition['validation'],
        validators: [],  // Runtime validators werden nicht in der DB gespeichert
        templateId: dt.templateId
      }))
    } catch (error) {
      this.logger.error('Fehler beim Laden der Liste:', error instanceof Error ? error : new Error('Unbekannter Fehler'))
      return []
    }
  }

  async update(id: string, definition: Partial<ContentTypeDefinition>): Promise<void> {
    try {
      await this.ensureConnection()

      const updateData: any = {}
      if (definition.type) updateData.type = definition.type
      if (definition.name) updateData.name = definition.name
      if (definition.description) updateData.description = definition.description
      if (definition.metadata) updateData.metadata = definition.metadata as unknown as Prisma.InputJsonValue
      if (definition.patterns) updateData.patterns = definition.patterns as unknown as Prisma.InputJsonValue
      if (definition.validation) updateData.validation = definition.validation as unknown as Prisma.InputJsonValue
      if (definition.templateId) {
        updateData.template = {
          connect: {
            id: definition.templateId
          }
        }
      }

      await prisma.documentType.update({
        where: { id },
        data: updateData
      })
      this.logger.info(`Content-Type ${id} aktualisiert`)
    } catch (error) {
      this.logger.error('Fehler beim Update:', error instanceof Error ? error : new Error('Unbekannter Fehler'))
      throw error
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.ensureConnection()

      await prisma.documentType.delete({
        where: { id }
      })
      this.logger.info(`Content-Type ${id} entfernt`)
    } catch (error) {
      this.logger.error('Fehler beim Entfernen:', error instanceof Error ? error : new Error('Unbekannter Fehler'))
      throw error
    }
  }

  async validateContent(content: string, typeId: string): Promise<boolean> {
    try {
      const contentType = await this.get(typeId)
      if (!contentType) return false

      // Führe Validierungen durch
      if (contentType.validators) {
        for (const validator of contentType.validators) {
          if (!await validator(content)) {
            return false
          }
        }
      }

      return true
    } catch (error) {
      this.logger.error('Fehler bei der Validierung:', error instanceof Error ? error : new Error('Unbekannter Fehler'))
      return false
    }
  }
} 