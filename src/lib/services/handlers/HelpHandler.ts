/**
 * @status deprecated
 * @replacement Use DynamicHandler with help configuration
 * @usage low
 * @scheduledRemoval 2024-Q2
 */

import { BaseHandler, HandlerRequest } from './base'
import { StructuredResponse } from '../search/types'

export class HelpHandler extends BaseHandler {
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
        handler: 'help',
        deprecated: true,
        replacement: 'DynamicHandler'
      }
    }
  }
} 