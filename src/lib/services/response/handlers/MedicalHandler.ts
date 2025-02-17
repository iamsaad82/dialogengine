import { BaseResponseHandler } from './base';
import { HandlerContext, HandlerResponse } from './base';
import { PineconeMetadata, isMedicalMetadata } from '../../metadata/types/pinecone';
import { HandlerConfig } from '../../../types/HandlerConfig';
import { medicalValidators } from '../../../validation/medical';

export class MedicalHandler extends BaseResponseHandler {
  constructor(templateId: string, config: HandlerConfig) {
    super(templateId, config);
  }

  canHandle(metadata: PineconeMetadata): boolean {
    return isMedicalMetadata(metadata);
  }

  async generateResponse(context: HandlerContext): Promise<HandlerResponse> {
    if (!context.metadata || !isMedicalMetadata(context.metadata)) {
      return this.getDefaultResponse(context);
    }

    const { medical } = context.metadata;
    let confidence = 0.7;

    // Generiere eine medizinische Antwort
    const response = {
      type: 'medical',
      text: this.formatMedicalResponse(medical),
      confidence,
      metadata: {
        source: 'medical_handler',
        timestamp: new Date().toISOString(),
        medical: {
          diagnosis: medical.diagnosis,
          treatment: medical.treatment,
          medications: medical.medications
        }
      }
    };

    // Berechne die finale Konfidenz
    return {
      ...response,
      confidence: this.calculateConfidence(response, context)
    };
  }

  private formatMedicalResponse(medical: any): string {
    const parts = [];

    if (medical.diagnosis) {
      parts.push(`Diagnose: ${medical.diagnosis}`);
    }

    if (medical.treatment) {
      parts.push(`Behandlung: ${medical.treatment}`);
    }

    if (medical.medications) {
      parts.push(`Medikamente: ${medical.medications}`);
    }

    if (medical.contraindications) {
      parts.push(`Kontraindikationen: ${medical.contraindications}`);
    }

    return parts.join('\n\n');
  }

  protected calculateConfidence(response: HandlerResponse, context: HandlerContext): number {
    let confidence = response.confidence || 0.5;

    // Erhöhe Konfidenz bei vollständigen medizinischen Daten
    if (context.metadata && isMedicalMetadata(context.metadata)) {
      const { medical } = context.metadata;
      if (medical.diagnosis && medical.treatment && medical.medications) {
        confidence *= 1.2;
      }
    }

    // Validiere die medizinischen Daten
    try {
      if (context.metadata && isMedicalMetadata(context.metadata)) {
        const { medical } = context.metadata;
        if (medical.medications && medicalValidators.validateMedications(medical.medications)) {
          confidence *= 1.1;
        }
        if (medical.contraindications && medicalValidators.validateContraindications(medical.contraindications)) {
          confidence *= 1.1;
        }
      }
    } catch (error) {
      confidence *= 0.8;
    }

    // Stelle sicher, dass die Konfidenz im gültigen Bereich liegt
    return Math.max(0, Math.min(1, confidence));
  }
} 