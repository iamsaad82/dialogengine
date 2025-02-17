import { EnhancedMetadata } from '../../../types/enhanced'
import { PineconeCityAdministrationMetadata } from '../../../types/pinecone'

/**
 * Basis-Klasse für Metadaten-Prozessoren
 */
export abstract class BaseMetadataProcessor {
  constructor(protected readonly templateId: string) {}

  /**
   * Verarbeitet die Metadaten und transformiert sie in das erweiterte Format
   */
  abstract process(metadata: PineconeCityAdministrationMetadata): Promise<EnhancedMetadata>
} 