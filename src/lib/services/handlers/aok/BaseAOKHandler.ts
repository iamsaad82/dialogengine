import { AOKBaseHandler, AOKHandlerResponse, AOKTopic } from './types'

export abstract class BaseAOKHandler implements AOKBaseHandler {
  protected topic: AOKTopic
  protected keywords: string[]

  constructor(topic: AOKTopic, keywords: string[]) {
    this.topic = topic
    this.keywords = keywords.map(k => k.toLowerCase())
  }

  canHandle(query: string): boolean {
    const lowercaseQuery = query.toLowerCase()
    return this.keywords.some(keyword => lowercaseQuery.includes(keyword))
  }

  abstract handleQuery(query: string): Promise<AOKHandlerResponse>

  protected getDefaultMetadata() {
    return {
      regions: ['Bundesweit verfügbar'],
      requirements: ['AOK-Mitgliedschaft'],
      nextSteps: [],
      actions: [],
      contactPoints: [
        {
          type: 'web',
          value: 'https://www.aok.de',
          description: 'AOK-Website'
        },
        {
          type: 'phone',
          value: '0800 0123456',
          description: 'AOK-Servicetelefon (kostenfrei)'
        }
      ]
    }
  }
} 