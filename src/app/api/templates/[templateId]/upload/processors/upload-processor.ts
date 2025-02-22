import { ContentProcessor } from '@/lib/services/upload/content/processor'
import { ContentAnalyzer } from '@/lib/services/upload/handlers/content-analyzer'
import { HandlerGenerator } from '@/lib/services/upload/handlers/handler-generator'
import { VectorManager } from '@/lib/services/upload/handlers/vector-manager'
import { JobManager } from '@/lib/services/upload/jobs/job-manager'
import { SchemaGenerator } from '@/lib/services/schema/schema-generator'
import { SchemaService } from '@/lib/services/schema/schema-service'
import { LayoutGenerator } from '@/lib/services/layout/LayoutGenerator'
import { LayoutService } from '@/lib/services/layout/LayoutService'
import { UploadJobMetadata, UploadJobStatus, ProcessingDetails } from '@/lib/types/upload/job'
import { ContentAnalysis } from '@/lib/types/upload/analysis'
import { BaseContentTypes } from '@/lib/types/contentTypes'
import type { BaseContentType } from '@/lib/types/contentTypes'
import { prisma } from '@/lib/prisma'
import { Logger } from '@/lib/utils/logger'

const SMALL_FILE_THRESHOLD = 10000 // ~10KB

// Hilfsfunktion für die Erstellung von Metadaten
function createMetadata(data: Partial<UploadJobMetadata>): Partial<UploadJobMetadata> {
  return {
    startTime: new Date().toISOString(),
    ...data
  }
}

// Hilfsfunktion zur Konvertierung von Content-Types
function mapToBaseContentType(type: string): BaseContentType {
  const mapping: Record<string, BaseContentType> = {
    'STANDARD': BaseContentTypes.DEFAULT,
    'DIENSTLEISTUNG': BaseContentTypes.SERVICE,
    'PRODUKT': BaseContentTypes.PRODUCT,
    'ARTIKEL': BaseContentTypes.ARTICLE,
    'FAQ': BaseContentTypes.FAQ,
    'KONTAKT': BaseContentTypes.CONTACT,
    'VERANSTALTUNG': BaseContentTypes.EVENT,
    'DOWNLOAD': BaseContentTypes.DOWNLOAD,
    'VIDEO': BaseContentTypes.VIDEO,
    'BILD': BaseContentTypes.IMAGE,
    'FORMULAR': BaseContentTypes.FORM,
    'PROFIL': BaseContentTypes.PROFILE,
    'STANDORT': BaseContentTypes.LOCATION,
    'TEXT': BaseContentTypes.TEXT,
    'ANLEITUNG': BaseContentTypes.TUTORIAL,
    'DOKUMENT': BaseContentTypes.DOCUMENT
  }
  return mapping[type.toUpperCase()] || BaseContentTypes.DEFAULT
}

export class UploadProcessor {
  private schemaGenerator: SchemaGenerator
  private schemaService: SchemaService
  private layoutGenerator: LayoutGenerator
  private layoutService: LayoutService
  private logger: Logger

  constructor(
    private contentProcessor: ContentProcessor,
    private contentAnalyzer: ContentAnalyzer,
    private handlerGenerator: HandlerGenerator,
    private vectorManager: VectorManager,
    private jobManager: JobManager
  ) {
    this.schemaGenerator = new SchemaGenerator()
    this.schemaService = new SchemaService()
    this.layoutGenerator = new LayoutGenerator()
    this.layoutService = new LayoutService()
    this.logger = new Logger('UploadProcessor')
  }

  async processUpload(jobId: string, files: File[], templateId: string) {
    try {
      const metadata = createMetadata({
        totalFiles: files.length,
        fileNames: files.map(f => f.name),
        sizes: files.map(f => f.size),
        types: files.map(f => f.type),
        currentOperation: 'Initialisiere Verarbeitung',
        processingDetails: {
          stage: 'start',
          message: 'Starte Verarbeitung'
        } as ProcessingDetails
      })

      await this.jobManager.updateJobStatus(jobId, 'processing' as UploadJobStatus, metadata)

      let processedFiles = 0
      for (const file of files) {
        try {
          await this.updateJobStatusForExtraction(jobId, file)
          const content = await this.contentProcessor.extractContent(file)

          if (content.length < SMALL_FILE_THRESHOLD) {
            await this.processSmallFile(jobId, file, content, templateId, processedFiles)
          } else {
            await this.processLargeFile(jobId, file, content, templateId, processedFiles)
          }

          processedFiles++
        } catch (error: any) {
          console.error(`Fehler bei der Verarbeitung von ${file.name}:`, error)
          await this.handleError(jobId, file, error)
        }
      }

      await this.completeJob(jobId, files.length)
    } catch (error: any) {
      console.error('Kritischer Fehler bei der Verarbeitung:', error)
      await this.jobManager.failJob(jobId, error)
      throw error
    }
  }

  private async processSmallFile(
    jobId: string,
    file: File,
    content: string,
    templateId: string,
    processedFiles: number
  ) {
    const analysis = await this.contentAnalyzer.analyzeContent(content)
    const contentType = mapToBaseContentType(analysis.type)
    
    // Generiere Schema
    this.logger.info(`Starte Schema-Generierung für Content-Typ: ${contentType}`)
    await this.updateJobStatus(jobId, 'Generiere Schema aus Analyse')
    const schema = await this.schemaGenerator.generateFromAnalysis(
      templateId,
      analysis,
      [{
        title: file.name,
        content: content
      }]
    )

    this.logger.info(`Schema generiert: ${schema.name} (Version ${schema.version})`)

    // Validiere und speichere Schema
    this.logger.info('Validiere generiertes Schema...')
    const validationResult = await this.schemaService.validateSchema(schema)
    if (validationResult.isValid) {
      this.logger.info('Schema-Validierung erfolgreich, speichere Schema...')
      await this.schemaService.saveSchema(schema)
      this.logger.info(`Schema ${schema.id} erfolgreich gespeichert`)
    } else {
      this.logger.warn(`Schema-Validierung fehlgeschlagen: ${validationResult.errors?.join(', ')}`)
    }
    
    const metadata = createMetadata({
      totalFiles: 1,
      currentOperation: 'vectorization',
      processingDetails: {
        stage: 'vectorization',
        message: 'Erstelle Vektoren für Suche'
      } as ProcessingDetails
    })
    
    await this.jobManager.updateJobStatus(jobId, 'processing' as UploadJobStatus, metadata)

    const vectorResult = await this.vectorManager.vectorizeWithRateLimit(
      content,
      {
        filename: file.name,
        path: '/',
        templateId,
        type: contentType,
        confidence: analysis.confidence
      },
      0
    )

    const existingHandlers = await prisma.template_handlers.findMany({
      where: { templateId }
    })

    const handlerIds = await this.handlerGenerator.generateHandlersForTopics(
      templateId,
      [{
        id: 'single_section',
        type: contentType,
        title: file.name,
        content: content,
        confidence: analysis.confidence,
        metadata: {
          domain: analysis.metadata.domain,
          subDomain: analysis.metadata.subDomain,
          keywords: analysis.metadata.relatedTopics || [],
          coverage: analysis.metadata.coverage || [],
          relationships: {
            relatedTopics: analysis.metadata.relatedTopics || []
          }
        }
      }],
      existingHandlers
    )

    // Generiere Layout
    this.logger.info('Generiere Layout basierend auf Analyse...')
    const existingLayouts = await this.layoutService.getLayoutsForTemplate(templateId)
    const layout = this.layoutGenerator.generateLayout(analysis, handlerIds[0], existingLayouts)
    
    try {
      await this.layoutService.createLayout(templateId, layout)
      this.logger.info(`Layout ${layout.id} erfolgreich erstellt`)
    } catch (error) {
      this.logger.error('Fehler beim Erstellen des Layouts:', error instanceof Error ? error : new Error('Unbekannter Fehler'))
    }

    await this.updateProgress(jobId, processedFiles, file, vectorResult, handlerIds)
  }

  private async processLargeFile(
    jobId: string,
    file: File,
    content: string,
    templateId: string,
    processedFiles: number
  ) {
    const metadata = createMetadata({
      totalFiles: 1,
      lastUpdateTime: new Date().toISOString(),
      processingDetails: {
        stage: 'analysis',
        message: 'Analysiere Dokumenteninhalte'
      } as ProcessingDetails
    })
    
    await this.jobManager.updateJobStatus(jobId, 'processing' as UploadJobStatus, metadata)
    const sections = await this.contentAnalyzer.detectTopicSections(content)

    // Generiere Schema
    const analysis = await this.contentAnalyzer.analyzeContent(content)
    const contentType = mapToBaseContentType(analysis.type)
    
    this.logger.info(`Starte Schema-Generierung für Content-Typ: ${contentType} mit ${sections.length} Sektionen`)
    await this.updateJobStatus(jobId, 'Generiere Schema aus Analyse')
    const schema = await this.schemaGenerator.generateFromAnalysis(
      templateId,
      analysis,
      sections
    )
    this.logger.info(`Schema generiert: ${schema.name} (Version ${schema.version})`)

    // Validiere und speichere Schema
    this.logger.info('Validiere generiertes Schema...')
    const validationResult = await this.schemaService.validateSchema(schema)
    if (validationResult.isValid) {
      this.logger.info('Schema-Validierung erfolgreich, speichere Schema...')
      await this.schemaService.saveSchema(schema)
      this.logger.info(`Schema ${schema.id} erfolgreich gespeichert`)
    } else {
      this.logger.warn(`Schema-Validierung fehlgeschlagen: ${validationResult.errors?.join(', ')}`)
    }

    await this.jobManager.updateJobStatus(jobId, 'processing' as UploadJobStatus, createMetadata({
      totalFiles: 1,
      lastUpdateTime: new Date().toISOString(),
      processingDetails: {
        stage: 'handler_generation',
        message: 'Generiere Content-Handler'
      } as ProcessingDetails
    }))
    
    const existingHandlers = await prisma.template_handlers.findMany({
      where: { templateId }
    })
    
    const handlerIds = await this.handlerGenerator.generateHandlersForTopics(
      templateId,
      sections,
      existingHandlers
    )

    // Generiere Layout für jeden Handler
    this.logger.info('Generiere Layouts basierend auf Analyse...')
    const existingLayouts = await this.layoutService.getLayoutsForTemplate(templateId)
    
    for (const handlerId of handlerIds) {
      const layout = this.layoutGenerator.generateLayout(analysis, handlerId, existingLayouts)
      try {
        await this.layoutService.createLayout(templateId, layout)
        this.logger.info(`Layout ${layout.id} erfolgreich erstellt`)
        existingLayouts.push(layout) // Aktualisiere die Liste für die nächste Version
      } catch (error) {
        this.logger.error('Fehler beim Erstellen des Layouts:', error instanceof Error ? error : new Error('Unbekannter Fehler'))
      }
    }

    await this.jobManager.updateJobStatus(jobId, 'processing' as UploadJobStatus, createMetadata({
      totalFiles: 1,
      lastUpdateTime: new Date().toISOString(),
      processingDetails: {
        stage: 'vectorization',
        message: 'Erstelle Vektoren für Suche'
      } as ProcessingDetails
    }))
    
    const vectorResult = await this.vectorManager.vectorizeMultiTopicContent(
      sections,
      {
        filename: file.name,
        path: '/',
        templateId
      }
    )

    await this.updateProgress(jobId, processedFiles, file, vectorResult, handlerIds)
  }

  private async updateJobStatusForExtraction(jobId: string, file: File) {
    const metadata = createMetadata({
      totalFiles: 1,
      lastProcessedFile: file.name,
      lastUpdateTime: new Date().toISOString(),
      processingDetails: {
        stage: 'extraction',
        message: 'Extrahiere Inhalte aus Dokument'
      } as ProcessingDetails
    })
    
    await this.jobManager.updateJobStatus(jobId, 'processing' as UploadJobStatus, metadata)
  }

  private async updateJobStatus(jobId: string, message: string) {
    const metadata = createMetadata({
      lastUpdateTime: new Date().toISOString(),
      processingDetails: {
        stage: 'processing',
        message
      } as ProcessingDetails
    })
    
    await this.jobManager.updateJobStatus(jobId, 'processing' as UploadJobStatus, metadata)
  }

  private async updateProgress(
    jobId: string,
    processedFiles: number,
    file: File,
    vectorResult: any,
    handlerIds: string[]
  ) {
    const metadata = createMetadata({
      totalFiles: 1,
      lastProcessedFile: file.name,
      lastUpdateTime: new Date().toISOString(),
      vectorCount: (vectorResult.metadata?.count || 0),
      vectorMetadata: vectorResult.metadata,
      handlerIds
    })
    
    await this.jobManager.updateJobProgress(jobId, processedFiles + 1, metadata)
  }

  private async handleError(jobId: string, file: File, error: Error) {
    const metadata = createMetadata({
      totalFiles: 1,
      error: `Fehler bei ${file.name}: ${error.message}`,
      errorFile: file.name,
      errorTime: new Date().toISOString(),
      processingDetails: {
        stage: 'error',
        message: `Fehler bei der Verarbeitung: ${error.message}`
      } as ProcessingDetails
    })
    
    await this.jobManager.updateJobStatus(jobId, 'error' as UploadJobStatus, metadata)
  }

  private async completeJob(jobId: string, totalFiles: number) {
    const endTime = new Date()
    const startTime = new Date(await this.getJobStartTime(jobId))
    const totalProcessingTime = endTime.getTime() - startTime.getTime()

    const metadata = createMetadata({
      totalFiles,
      completionTime: endTime.toISOString(),
      finalStats: {
        totalFiles,
        totalProcessingTime,
        averageVectorCount: 0,
        totalVectors: 0
      }
    })
    
    await this.jobManager.completeJob(jobId, metadata)
  }

  private async getJobStartTime(jobId: string): Promise<string> {
    const job = await prisma.uploadJob.findUnique({
      where: { id: jobId },
      select: { metadata: true }
    })
    
    if (!job?.metadata || typeof job.metadata !== 'object') {
      return new Date().toISOString()
    }
    
    const metadata = job.metadata as Record<string, unknown>
    return (metadata.startTime as string) || new Date().toISOString()
  }
} 