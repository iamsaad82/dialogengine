import { ContentType, ContentTypeEnum } from '../types/contentTypes'
import { OpenAI } from 'openai'

export interface DetectionInput {
  text: string
  title: string
  url: string
}

export interface DetectionResult {
  type: ContentType
  confidence: number
}

export class ContentTypeDetector {
  private openai: OpenAI

  constructor(openai: OpenAI) {
    this.openai = openai
  }

  async detect(input: DetectionInput): Promise<DetectionResult> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Du bist ein Content-Type-Detector. Analysiere den gegebenen Text und Titel, um den passenden Content-Type zu bestimmen. 
                     Mögliche Typen sind: ${Object.values(ContentTypeEnum).join(', ')}`
          },
          {
            role: 'user',
            content: `Text: ${input.text}\nTitel: ${input.title}\nURL: ${input.url}`
          }
        ],
        temperature: 0.3
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        return {
          type: ContentTypeEnum.INFO,
          confidence: 0
        }
      }

      const result = JSON.parse(content) as DetectionResult

      // Validiere den zurückgegebenen Typ
      if (!Object.values(ContentTypeEnum).includes(result.type)) {
        return {
          type: ContentTypeEnum.INFO,
          confidence: 0
        }
      }

      return result
    } catch (error) {
      console.error('Fehler bei der Content-Type-Erkennung:', error)
      return {
        type: ContentTypeEnum.INFO,
        confidence: 0
      }
    }
  }

  async detectBatch(inputs: DetectionInput[]): Promise<DetectionResult[]> {
    const promises = inputs.map(input => this.detect(input))
    return Promise.all(promises)
  }
} 