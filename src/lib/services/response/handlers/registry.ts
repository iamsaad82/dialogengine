import { IResponseHandler } from './base'
import { HandlerConfig } from '../../../types/HandlerConfig'
import { ContentType, isValidContentType } from '../../../types/contentTypes'
import { MonitoringService } from '../../../monitoring/monitoring'

interface HandlerVersion {
  version: string
  handler: IResponseHandler
  config: HandlerConfig
  createdAt: Date
  updatedAt: Date
}

interface HandlerRegistryEntry {
  type: ContentType
  versions: Map<string, HandlerVersion>
  activeVersion: string
}

export class HandlerRegistry {
  private readonly registry: Map<string, HandlerRegistryEntry> = new Map()
  private readonly monitoring: MonitoringService

  constructor(monitoring: MonitoringService) {
    this.monitoring = monitoring
  }

  /**
   * Registriert einen neuen Handler mit Version
   */
  registerHandler(
    type: string,
    version: string,
    handler: IResponseHandler,
    config: HandlerConfig
  ): void {
    if (!isValidContentType(type)) {
      throw new Error(`Ungültiger Handler-Typ: ${type}`)
    }

    const now = new Date()
    const handlerVersion: HandlerVersion = {
      version,
      handler,
      config,
      createdAt: now,
      updatedAt: now
    }

    let entry = this.registry.get(type)
    if (!entry) {
      entry = {
        type,
        versions: new Map(),
        activeVersion: version
      }
      this.registry.set(type, entry)
    }

    entry.versions.set(version, handlerVersion)
    
    // Monitoring-Metriken aufzeichnen
    this.monitoring.recordHandlerCall(type, true)
  }

  /**
   * Ruft einen Handler in einer bestimmten Version ab
   */
  getHandler(type: string, version?: string): IResponseHandler | null {
    const entry = this.registry.get(type)
    if (!entry) return null

    const targetVersion = version || entry.activeVersion
    const handlerVersion = entry.versions.get(targetVersion)
    
    return handlerVersion?.handler || null
  }

  /**
   * Aktualisiert die Konfiguration eines Handlers
   */
  updateHandler(
    type: string,
    version: string,
    config: Partial<HandlerConfig>
  ): void {
    const entry = this.registry.get(type)
    if (!entry) {
      throw new Error(`Handler ${type} nicht gefunden`)
    }

    const handlerVersion = entry.versions.get(version)
    if (!handlerVersion) {
      throw new Error(`Version ${version} für Handler ${type} nicht gefunden`)
    }

    handlerVersion.config = {
      ...handlerVersion.config,
      ...config,
      lastUpdated: new Date().toISOString()
    }
    handlerVersion.updatedAt = new Date()
  }

  /**
   * Setzt die aktive Version eines Handlers
   */
  setActiveVersion(type: string, version: string): void {
    const entry = this.registry.get(type)
    if (!entry) {
      throw new Error(`Handler ${type} nicht gefunden`)
    }

    if (!entry.versions.has(version)) {
      throw new Error(`Version ${version} für Handler ${type} nicht gefunden`)
    }

    entry.activeVersion = version
  }

  /**
   * Ruft alle verfügbaren Versionen eines Handlers ab
   */
  getHandlerVersions(type: string): string[] {
    const entry = this.registry.get(type)
    return entry ? Array.from(entry.versions.keys()) : []
  }

  /**
   * Ruft die aktive Version eines Handlers ab
   */
  getActiveVersion(type: string): string | null {
    const entry = this.registry.get(type)
    return entry ? entry.activeVersion : null
  }

  /**
   * Prüft auf Konflikte zwischen Handler-Versionen
   */
  checkConflicts(type: string, version1: string, version2: string): boolean {
    const entry = this.registry.get(type)
    if (!entry) return false

    const handler1 = entry.versions.get(version1)
    const handler2 = entry.versions.get(version2)

    if (!handler1 || !handler2) return false

    // Prüfe auf überlappende Konfigurationen
    const config1 = handler1.config
    const config2 = handler2.config

    return (
      config1.type === config2.type &&
      JSON.stringify(config1.searchFields) === JSON.stringify(config2.searchFields)
    )
  }

  /**
   * Entfernt eine Handler-Version
   */
  removeVersion(type: string, version: string): void {
    const entry = this.registry.get(type)
    if (!entry) return

    if (entry.activeVersion === version) {
      throw new Error(`Aktive Version ${version} kann nicht entfernt werden`)
    }

    entry.versions.delete(version)
  }

  /**
   * Bereinigt alte Handler-Versionen
   */
  cleanupOldVersions(type: string, keepCount: number = 5): void {
    const entry = this.registry.get(type)
    if (!entry) return

    const versions = Array.from(entry.versions.entries())
      .sort((a, b) => b[1].updatedAt.getTime() - a[1].updatedAt.getTime())

    if (versions.length <= keepCount) return

    versions.slice(keepCount).forEach(([version]) => {
      if (version !== entry.activeVersion) {
        entry.versions.delete(version)
      }
    })
  }
} 