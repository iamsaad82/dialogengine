import { BaseResponseHandler } from './base';
import { HandlerContext, HandlerResponse } from './base';
import { PineconeMetadata } from '../../metadata/types/pinecone';
import { HandlerConfig } from '../../../types/HandlerConfig';

export class DefaultHandler extends BaseResponseHandler {
  constructor(templateId: string, config: HandlerConfig) {
    super(templateId, config);
  }

  canHandle(metadata: PineconeMetadata): boolean {
    // Der Default-Handler kann alle Metadaten verarbeiten
    return true;
  }

  async generateResponse(context: HandlerContext): Promise<HandlerResponse> {
    return {
      type: 'info',
      text: 'Dies ist eine Standard-Antwort.',
      confidence: 0.5,
      metadata: {
        source: 'default_handler',
        timestamp: new Date().toISOString()
      }
    };
  }
} 