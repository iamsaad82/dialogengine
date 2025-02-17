import { BaseHandler } from './BaseHandler'
import { HandlerConfig } from '../types/HandlerConfig'

export class TestHandler extends BaseHandler {
  constructor() {
    // Minimale Handler-Konfiguration
    super({
      type: 'test',
      searchFields: ['message', 'content'],
      responseTemplate: '{"message": "{{message}}"}',
      validationRules: {
        type: 'test',
        required: [],
        validation: {}
      }
    })
  }

  protected async search(query: string): Promise<any[]> {
    // Simuliere verschiedene Szenarien basierend auf der Query
    
    // Simuliere Timeout/langsame Antwort
    if (query.includes('slow')) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      return [{ message: 'Langsame Antwort' }]
    }

    // Simuliere Fehler
    if (query.includes('error')) {
      throw new Error('Simulierter Fehler')
    }

    // Simuliere schnelle Antwort
    if (query.includes('fast')) {
      return [{ message: 'Schnelle Antwort' }]
    }

    // Standard-Antwort
    await new Promise(resolve => setTimeout(resolve, 100))
    return [{ message: `Antwort auf: ${query}` }]
  }
} 