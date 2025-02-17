import { PineconeMetadata } from '../types/pinecone'
import { EnhancedMetadata } from '../types/enhanced'

/**
 * Basis-Klasse für Metadaten-Prozessoren
 */
export abstract class BaseMetadataProcessor {
  constructor(protected readonly templateId: string) {}

  /**
   * Verarbeitet die Metadaten und transformiert sie in das erweiterte Format
   */
  abstract process(metadata: PineconeMetadata): Promise<EnhancedMetadata>
} 