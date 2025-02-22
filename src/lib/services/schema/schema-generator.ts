import { Logger } from '@/lib/utils/logger'
import { prisma } from '@/lib/prisma'
import { ContentAnalysis, ContentPattern, ContentField } from '@/lib/types/upload/analysis'
import type { ExtractionSchema, ExtractionSchemaFields } from '@/lib/types/schema'
import type { Prisma } from '@prisma/client'
import type { MetadataFieldType, DocumentPattern, MetadataDefinition } from '@/lib/types/common'
import { BaseContentType } from '@/lib/types/contentTypes'

export class SchemaGenerator {
  private logger: Logger

  constructor() {
    this.logger = new Logger('SchemaGenerator')
  }

  private async getNextSchemaVersion(templateId: string, name: string): Promise<number> {
    // Finde das letzte Schema mit diesem Namen
    const existingSchema = await prisma.extractionSchema.findFirst({
      where: {
        templateId,
        name
      },
      orderBy: {
        version: 'desc'
      }
    })

    return existingSchema ? existingSchema.version + 1 : 1
  }

  async generateFromAnalysis(
    templateId: string,
    analysis: ContentAnalysis,
    sections: { title: string; content: string }[]
  ): Promise<Omit<ExtractionSchema, 'id'>> {
    const schemaName = sections[0]?.title || 'Unbenanntes Schema'
    const nextVersion = await this.getNextSchemaVersion(templateId, schemaName)

    const schema: Omit<ExtractionSchema, 'id'> = {
      name: schemaName,
      description: `Automatisch generiertes Schema basierend auf ${sections[0]?.title || 'Dokumentenanalyse'}`,
      templateId,
      version: nextVersion,
      fields: {
        name: schemaName,
        version: nextVersion,
        patterns: analysis.patterns.map(p => ({
          name: p.title || 'Unbenanntes Pattern',
          pattern: p.regex,
          required: p.confidence > 0.8,
          confidence: p.confidence,
          examples: p.matches || [],
          description: p.description || ''
        })) as DocumentPattern[],
        metadata: analysis.fields.map(f => ({
          name: f.name,
          type: this.mapFieldType(f.type),
          required: f.required || false,
          description: f.description || '',
          value: f.value || ''
        })) as MetadataDefinition[],
        settings: {
          confidence: analysis.confidence,
          requiresValidation: analysis.confidence < 0.8
        },
        responseTypes: []
      },
      metadata: {
        generated: true,
        lastAnalysis: new Date(),
        documentCount: 1,
        extractedTypes: [{
          type: analysis.type as BaseContentType,
          count: 1,
          confidence: analysis.confidence
        }],
        performance: {
          averageProcessingTime: 0,
          successRate: 1
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.logger.info(`Schema generiert: ${schema.name}`)
    return schema
  }

  private mapFieldType(type: string): MetadataFieldType {
    const typeMap: Record<string, MetadataFieldType> = {
      'text': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'array': 'array',
      'object': 'object',
      'date': 'date'
    }
    return typeMap[type.toLowerCase()] || 'string'
  }

  async updateSchema(
    schemaId: string,
    updates: Partial<ExtractionSchema>
  ): Promise<ExtractionSchema> {
    // Hole das bestehende Schema
    const existing = await prisma.extractionSchema.findUnique({
      where: { id: schemaId }
    })

    if (!existing) {
      throw new Error('Schema nicht gefunden')
    }

    // Bereite die Update-Daten vor
    const updateData: Prisma.ExtractionSchemaUpdateInput = {
      name: updates.name,
      description: updates.description,
      version: updates.version,
      fields: updates.fields ? (updates.fields as unknown as Prisma.InputJsonValue) : undefined,
      metadata: updates.metadata ? {
        ...JSON.parse(existing.metadata as string),
        ...updates.metadata,
        validated: true
      } as Prisma.InputJsonValue : undefined
    }

    // Aktualisiere das Schema
    const updated = await prisma.extractionSchema.update({
      where: { id: schemaId },
      data: updateData
    })

    // Konvertiere das aktualisierte Schema zurück
    return {
      id: updated.id,
      templateId: updated.templateId,
      name: updated.name,
      description: updated.description || '',
      version: updated.version,
      fields: JSON.parse(updated.fields as string) as ExtractionSchemaFields,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      metadata: updated.metadata as ExtractionSchema['metadata']
    }
  }

  async deleteSchema(schemaId: string): Promise<void> {
    await prisma.extractionSchema.delete({
      where: { id: schemaId }
    })
  }
} 