import { Logger } from '@/lib/utils/logger'
import { prisma } from '@/lib/prisma'
import type { ExtractionSchema, SchemaValidationResult } from '@/lib/types/schema'
import type { Prisma, ExtractionSchema as PrismaSchema } from '@prisma/client'

export class SchemaService {
  private logger: Logger

  constructor() {
    this.logger = new Logger('SchemaService')
  }

  /**
   * Speichert ein neues Schema oder aktualisiert ein bestehendes
   */
  async saveSchema(schema: ExtractionSchema): Promise<ExtractionSchema> {
    try {
      // Konvertiere die Felder in JSON
      const jsonFields = JSON.stringify(schema.fields)
      const jsonMetadata = schema.metadata ? JSON.stringify(schema.metadata) : undefined

      // Erstelle neues Schema, wenn keine ID vorhanden ist
      if (!schema.id) {
        const created = await prisma.extractionSchema.create({
          data: {
            templateId: schema.templateId,
            name: schema.name,
            description: schema.description,
            version: schema.version,
            fields: jsonFields as unknown as Prisma.InputJsonValue,
            metadata: jsonMetadata as unknown as Prisma.InputJsonValue,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        
        this.logger.info(`Neues Schema erstellt: ${created.id}`)
        return this.mapToSchema(created)
      }

      // Update existierendes Schema
      const updated = await prisma.extractionSchema.update({
        where: { id: schema.id },
        data: {
          templateId: schema.templateId,
          name: schema.name,
          description: schema.description,
          version: schema.version,
          fields: jsonFields as unknown as Prisma.InputJsonValue,
          metadata: jsonMetadata as unknown as Prisma.InputJsonValue,
          updatedAt: new Date()
        }
      })
      
      this.logger.info(`Schema aktualisiert: ${updated.id}`)
      return this.mapToSchema(updated)
    } catch (error) {
      this.logger.error('Fehler beim Speichern des Schemas:', error instanceof Error ? error : new Error('Unbekannter Fehler'))
      throw error
    }
  }

  /**
   * Lädt ein Schema anhand seiner ID
   */
  async getSchema(id: string): Promise<ExtractionSchema | null> {
    try {
      const schema = await prisma.extractionSchema.findUnique({
        where: { id }
      })
      
      if (!schema) return null
      return this.mapToSchema(schema)
    } catch (error) {
      this.logger.error('Fehler beim Laden des Schemas:', error instanceof Error ? error : new Error('Unbekannter Fehler'))
      throw error
    }
  }

  /**
   * Lädt alle Schemas für ein Template
   */
  async getSchemasByTemplate(templateId: string): Promise<ExtractionSchema[]> {
    try {
      const schemas = await prisma.extractionSchema.findMany({
        where: { templateId }
      })
      
      return schemas.map(schema => this.mapToSchema(schema))
    } catch (error) {
      this.logger.error('Fehler beim Laden der Template-Schemas:', error instanceof Error ? error : new Error('Unbekannter Fehler'))
      throw error
    }
  }

  /**
   * Löscht ein Schema
   */
  async deleteSchema(id: string): Promise<void> {
    try {
      await prisma.extractionSchema.delete({
        where: { id }
      })
      
      this.logger.info(`Schema ${id} gelöscht`)
    } catch (error) {
      this.logger.error('Fehler beim Löschen des Schemas:', error instanceof Error ? error : new Error('Unbekannter Fehler'))
      throw error
    }
  }

  /**
   * Validiert ein Schema
   */
  async validateSchema(schema: ExtractionSchema): Promise<SchemaValidationResult> {
    try {
      // Basis-Validierung
      if (!schema.templateId || !schema.name || !schema.fields) {
        return {
          isValid: false,
          errors: ['Pflichtfelder fehlen']
        }
      }

      // Validiere Patterns
      if (!Array.isArray(schema.fields.patterns)) {
        return {
          isValid: false,
          errors: ['Ungültige Patterns']
        }
      }

      // Validiere Metadata-Felder
      if (!Array.isArray(schema.fields.metadata)) {
        return {
          isValid: false,
          errors: ['Ungültige Metadata-Felder']
        }
      }

      // Validiere Response-Types
      if (!Array.isArray(schema.fields.responseTypes)) {
        return {
          isValid: false,
          errors: ['Ungültige Response-Types']
        }
      }

      // Prüfe Version
      if (schema.id) {
        const existing = await this.getSchema(schema.id)
        if (existing && existing.version >= schema.version) {
          return {
            isValid: false,
            errors: ['Version muss größer sein als die existierende Version']
          }
        }
      }

      return {
        isValid: true,
        metadata: {
          validatedAt: new Date(),
          version: schema.version
        }
      }
    } catch (error) {
      this.logger.error('Fehler bei der Schema-Validierung:', error instanceof Error ? error : new Error('Unbekannter Fehler'))
      return {
        isValid: false,
        errors: ['Interner Validierungsfehler']
      }
    }
  }

  /**
   * Konvertiert ein Prisma-Schema-Objekt in ein ExtractionSchema
   */
  private mapToSchema(data: PrismaSchema): ExtractionSchema {
    const fields = typeof data.fields === 'string' ? JSON.parse(data.fields) : data.fields
    const metadata = data.metadata 
      ? (typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata)
      : undefined

    return {
      id: data.id,
      templateId: data.templateId,
      name: data.name,
      description: data.description || '',
      version: data.version,
      fields,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      metadata
    }
  }
} 