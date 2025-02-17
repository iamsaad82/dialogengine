import { HandlerResponse, HandlerContext } from '../types/responses';
import { SchemaDefinition, SchemaValidationResult } from '../types/schema';

export abstract class BaseHandler {
  constructor(protected schema: SchemaDefinition) {}

  abstract generateResponse(context: HandlerContext): Promise<HandlerResponse>;

  protected async validateSchema(data: unknown): Promise<SchemaValidationResult> {
    // Basic schema validation
    const result: SchemaValidationResult = {
      isValid: true,
      errors: [],
      metadata: {}
    };

    // Implement basic validation logic
    // In real implementation: Add more sophisticated validation

    return result;
  }

  protected async enrichResponse(response: HandlerResponse): Promise<HandlerResponse> {
    // Add common response enrichment logic
    return {
      ...response,
      metadata: {
        ...response.metadata,
        schemaType: this.schema.type,
        timestamp: new Date().toISOString()
      }
    };
  }
} 