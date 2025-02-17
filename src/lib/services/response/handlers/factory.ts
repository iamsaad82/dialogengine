import { HandlerGenerator } from '../../../handlers/HandlerGenerator'
import { IResponseHandler, BaseResponseHandler } from './base'
import { PineconeMetadata } from '../../metadata/types/pinecone'
import { HandlerConfig } from '../../../types/HandlerConfig'
import { MonitoringService } from '../../../monitoring/monitoring'
import { MedicalHandler } from './MedicalHandler'
import { InsuranceHandler } from './InsuranceHandler'
import { CityAdministrationHandler } from './CityAdministrationHandler'
import { DefaultHandler } from './DefaultHandler'
import { HandlerRegistry } from './registry'

/**
 * Factory für die Erstellung von Response-Handlern
 */
export class ResponseHandlerFactory {
  private static instance: ResponseHandlerFactory
  private readonly handlers: Map<string, Map<string, IResponseHandler>> = new Map()
  private readonly handlerGenerator: HandlerGenerator
  private readonly registry: HandlerRegistry

  constructor(
    private readonly openaiApiKey: string,
    private readonly monitoring: MonitoringService
  ) {
    this.handlerGenerator = new HandlerGenerator(openaiApiKey, monitoring)
    this.registry = new HandlerRegistry(monitoring)
  }

  /**
   * Singleton-Instanz der Factory
   */
  static getInstance(openaiApiKey: string, monitoring: MonitoringService): ResponseHandlerFactory {
    if (!ResponseHandlerFactory.instance) {
      ResponseHandlerFactory.instance = new ResponseHandlerFactory(openaiApiKey, monitoring)
    }
    return ResponseHandlerFactory.instance
  }

  /**
   * Registriert einen neuen Handler für ein Template und einen Typ
   */
  registerHandler(templateId: string, type: string, handler: IResponseHandler): void {
    let templateHandlers = this.handlers.get(templateId)
    if (!templateHandlers) {
      templateHandlers = new Map()
      this.handlers.set(templateId, templateHandlers)
    }
    templateHandlers.set(type, handler)
  }

  /**
   * Aktualisiert einen bestehenden Handler basierend auf neuen Metadaten
   */
  private async updateHandler(
    templateId: string,
    type: string,
    metadata: PineconeMetadata
  ): Promise<IResponseHandler> {
    const templateHandlers = this.handlers.get(templateId)
    const existingHandler = templateHandlers?.get(type)
    
    if (!existingHandler) {
      throw new Error(`Kein Handler für Typ ${type} gefunden`)
    }

    try {
      // Adaptiere die Handler-Konfiguration
      const adaptedConfig = await this.handlerGenerator.adaptHandler(
        type,
        {
          type: metadata.type,
          title: metadata.contentId,
          description: metadata.type,
          template: metadata.templateId,
          lastUpdated: metadata.lastUpdated,
          additionalFields: {}
        },
        existingHandler.getConfig()
      )

      // Erstelle einen neuen Handler mit der adaptierten Konfiguration
      const updatedHandler = this.createHandler(templateId, type, adaptedConfig)
      
      // Registriere den aktualisierten Handler
      this.registerHandler(templateId, type, updatedHandler)

      return updatedHandler
    } catch (error) {
      console.error(`Fehler bei der Handler-Anpassung für ${type}:`, error)
      return existingHandler
    }
  }

  /**
   * Erstellt oder aktualisiert einen Handler für die gegebenen Metadaten
   */
  public async getHandler(templateId: string, metadata: PineconeMetadata): Promise<IResponseHandler> {
    const type = this.determineHandlerType(metadata)
    const templateHandlers = this.handlers.get(templateId)
    const existingHandler = templateHandlers?.get(type)
    
    if (!existingHandler) {
      // Erstelle einen neuen Handler mit Standardkonfiguration
      const defaultConfig: HandlerConfig = {
        type: metadata.type,
        searchFields: ['title', 'description'],
        responseTemplate: '{"type":"{{type}}","text":"{{text}}"}',
        validationRules: {
          type: metadata.type,
          required: [],
          validation: {}
        }
      }
      const newHandler = this.createHandler(templateId, type, defaultConfig)
      this.registerHandler(templateId, type, newHandler)
      return newHandler
    }

    // Prüfe, ob der Handler aktualisiert werden muss
    if (this.shouldUpdateHandler(existingHandler, metadata)) {
      return this.updateHandler(templateId, type, metadata)
    }

    return existingHandler
  }

  /**
   * Prüft, ob ein Handler aktualisiert werden muss
   */
  private shouldUpdateHandler(handler: IResponseHandler, metadata: PineconeMetadata): boolean {
    // Prüfe das Alter des Handlers
    const config = handler.getConfig()
    if (!config.lastUpdated) {
      return true
    }

    const lastUpdate = new Date(config.lastUpdated).getTime()
    const metadataUpdate = new Date(metadata.lastUpdated).getTime()
    
    // Aktualisiere, wenn die Metadaten neuer sind
    if (metadataUpdate > lastUpdate) {
      return true
    }

    // Prüfe auf neue Felder in den Metadaten
    const currentFields = Array.from(new Set(config.searchFields))
    const metadataFields = Array.from(new Set(Object.keys(metadata)))
    
    return metadataFields.some(field => !currentFields.includes(field))
  }

  /**
   * Bestimmt den Handler-Typ basierend auf den Metadaten
   */
  private determineHandlerType(metadata: PineconeMetadata): string {
    return `${metadata.type}_${metadata.templateId}`.toLowerCase()
  }

  /**
   * Erstellt einen neuen Handler basierend auf dem Typ
   */
  private createHandler(templateId: string, type: string, config: HandlerConfig): IResponseHandler {
    let handler: IResponseHandler

    switch (type) {
      case 'city-administration':
        handler = new CityAdministrationHandler(templateId, config)
        break
      case 'medical':
        handler = new MedicalHandler(templateId, config)
        break
      case 'insurance':
        handler = new InsuranceHandler(templateId, config)
        break
      default:
        handler = new DefaultHandler(templateId, config)
    }

    // Registriere den Handler in der Registry
    const version = this.generateVersion()
    this.registry.registerHandler(type, version, handler, config)

    return handler
  }

  /**
   * Generiert eine neue Versionskennung
   */
  private generateVersion(): string {
    return `v${Date.now()}`
  }

  /**
   * Ruft alle verfügbaren Handler-Versionen ab
   */
  public getHandlerVersions(type: string): string[] {
    return this.registry.getHandlerVersions(type)
  }

  /**
   * Setzt die aktive Version eines Handlers
   */
  public setActiveVersion(type: string, version: string): void {
    this.registry.setActiveVersion(type, version)
  }

  /**
   * Bereinigt alte Handler-Versionen
   */
  public cleanupOldVersions(type: string, keepCount?: number): void {
    this.registry.cleanupOldVersions(type, keepCount)
  }

  /**
   * Entfernt einen Handler für ein Template und einen Typ
   */
  removeHandler(templateId: string, type: string): void {
    const templateHandlers = this.handlers.get(templateId)
    if (templateHandlers) {
      templateHandlers.delete(type)
      if (templateHandlers.size === 0) {
        this.handlers.delete(templateId)
      }
    }
  }

  /**
   * Löscht alle registrierten Handler
   */
  clearHandlers(): void {
    this.handlers.clear()
  }
} 