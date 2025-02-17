import { SmartSearch } from '../search/core/search';
import { SearchContext, StructuredResponse } from '../search/types';
import { SchemaDefinition } from '../../types/schema';

export class DynamicHandlerAnalyzer {
  constructor(private readonly smartSearch: SmartSearch) {}

  async analyzeContent(content: string, templateId: string): Promise<{
    type: string;
    schema: SchemaDefinition;
    metadata: Record<string, unknown>;
  }> {
    // Nutze die bestehende Search-Funktionalität
    const searchContext: SearchContext = {
      query: "Analysiere den folgenden Content und extrahiere Schema und Metadaten: " + content,
      templateId,
      metadata: {
        mode: 'analysis',
        contentToAnalyze: content
      }
    };

    const searchResult = await this.smartSearch.search(searchContext);

    // Extrahiere Schema und Metadaten aus der Antwort
    const schema = this.extractSchemaFromResponse(searchResult);
    const metadata = this.extractMetadataFromResponse(searchResult);

    return {
      type: searchResult.type || 'default',
      schema,
      metadata
    };
  }

  private extractSchemaFromResponse(result: StructuredResponse): SchemaDefinition {
    // Extrahiere Schema aus den Metadaten oder generiere ein Standard-Schema
    const defaultSchema: SchemaDefinition = {
      type: result.type || 'default',
      properties: {
        content: {
          type: 'string',
          description: 'Der Hauptinhalt'
        }
      },
      required: ['content']
    };

    // Versuche, ein Schema aus den Metadaten zu extrahieren
    if (result.metadata?.schema) {
      try {
        const extractedSchema = result.metadata.schema as SchemaDefinition;
        return {
          ...defaultSchema,
          ...extractedSchema
        };
      } catch (error) {
        console.warn('Konnte Schema nicht aus Metadaten extrahieren:', error);
      }
    }

    return defaultSchema;
  }

  private extractMetadataFromResponse(result: StructuredResponse): Record<string, unknown> {
    return {
      ...result.metadata,
      analyzedAt: new Date().toISOString(),
      confidence: result.confidence
    };
  }
} 