/**
 * @status deprecated
 * @replacement Use DynamicHandler with FAQ configuration
 * @usage low
 * @scheduledRemoval 2024-Q2
 */

import { BaseHandler, HandlerRequest } from './base'
import { StructuredResponse } from '../search/types'

export class FAQHandler extends BaseHandler {
  async canHandle(request: HandlerRequest): Promise<boolean> {
    // Deprecated - use DynamicHandler instead
    return false
  }

  async handle(request: HandlerRequest): Promise<StructuredResponse> {
    // Deprecated - use DynamicHandler instead
    return {
      type: 'info',
      answer: 'Dieser Handler ist veraltet. Bitte verwenden Sie den DynamicHandler.',
      confidence: 0,
      metadata: {
        handler: 'faq',
        deprecated: true,
        replacement: 'DynamicHandler'
      }
    }
  }
} 