import { BaseResponseHandler } from './base';
import { HandlerContext, HandlerResponse } from './base';
import { PineconeMetadata, PineconeInsuranceMetadata } from '../../metadata/types/pinecone';
import { HandlerConfig } from '../../../types/HandlerConfig';

export class InsuranceHandler extends BaseResponseHandler {
  constructor(templateId: string, config: HandlerConfig) {
    super(templateId, config);
  }

  canHandle(metadata: PineconeMetadata): boolean {
    return metadata.type === 'insurance';
  }

  async generateResponse(context: HandlerContext): Promise<HandlerResponse> {
    if (!context.metadata || context.metadata.type !== 'insurance') {
      return this.getDefaultResponse(context);
    }

    const { insurance } = context.metadata as PineconeInsuranceMetadata;
    let confidence = 0.7;

    // Generiere eine Versicherungsantwort
    const response = {
      type: 'insurance',
      text: this.formatInsuranceResponse(insurance),
      confidence,
      metadata: {
        source: 'insurance_handler',
        timestamp: new Date().toISOString(),
        insurance: {
          provider: insurance.provider,
          policyType: insurance.policyType,
          coverage: insurance.coverage
        }
      }
    };

    // Berechne die finale Konfidenz
    return {
      ...response,
      confidence: this.calculateConfidence(response, context)
    };
  }

  private formatInsuranceResponse(insurance: PineconeInsuranceMetadata['insurance']): string {
    const parts = [];

    if (insurance.provider) {
      parts.push(`Versicherungsanbieter: ${insurance.provider}`);
    }

    if (insurance.policyType) {
      parts.push(`Versicherungsart: ${insurance.policyType}`);
    }

    if (insurance.coverage) {
      parts.push(`Versicherungsumfang: ${insurance.coverage.join(', ')}`);
    }

    if (insurance.requirements) {
      parts.push(`Voraussetzungen: ${insurance.requirements.join(', ')}`);
    }

    return parts.join('\n\n');
  }

  protected calculateConfidence(response: HandlerResponse, context: HandlerContext): number {
    let confidence = response.confidence || 0.5;

    // Erhöhe Konfidenz bei vollständigen Versicherungsdaten
    if (context.metadata && context.metadata.type === 'insurance') {
      const { insurance } = context.metadata as PineconeInsuranceMetadata;
      if (insurance.provider && insurance.policyType) {
        confidence *= 1.2;
      }
      if (insurance.coverage && insurance.coverage.length > 0) {
        confidence *= 1.1;
      }
      if (insurance.requirements && insurance.requirements.length > 0) {
        confidence *= 1.1;
      }
    }

    // Stelle sicher, dass die Konfidenz im gültigen Bereich liegt
    return Math.max(0, Math.min(1, confidence));
  }
} 