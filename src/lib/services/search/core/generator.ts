import { OpenAI } from 'openai'
import { Anthropic } from '@anthropic-ai/sdk'
import { 
  SearchContext,
  SearchResult,
  StructuredResponse,
  QueryAnalysis,
  ContentType,
  ResponseTemplate,
  TemplateVariables
} from '../types'

interface GeneratorConfig {
  openai: OpenAI
  anthropic?: Anthropic
  temperature?: number
  maxTokens?: number
}

export class ResponseGenerator {
  private readonly openai: OpenAI
  private readonly anthropic?: Anthropic
  private readonly temperature: number
  private readonly maxTokens: number

  private readonly templates: Partial<Record<ContentType, ResponseTemplate>> = {
    info: {
      type: 'info',
      template: `Hier sind die Informationen zu Ihrer Anfrage:

{{context}}

{{#if metadata.requirements}}
Voraussetzungen:
{{#each metadata.requirements}}
- {{this}}
{{/each}}
{{/if}}

{{#if metadata.costs}}
Kosten:
- {{metadata.costs.amount}} {{metadata.costs.currency}}
{{#if metadata.costs.details}}
{{#each metadata.costs.details}}
- {{this}}
{{/each}}
{{/if}}
{{/if}}

{{#if metadata.sources}}
Quellen:
{{#each metadata.sources}}
- {{title}}: {{url}}
{{/each}}
{{/if}}`,
      labels: {
        title: 'Information',
        description: 'Allgemeine Information'
      }
    },
    medical: {
      type: 'medical',
      template: `Medizinische Information zu Ihrer Anfrage:

{{context}}

{{#if metadata.requirements}}
Wichtige Hinweise:
{{#each metadata.requirements}}
- {{this}}
{{/each}}
{{/if}}

{{#if metadata.coverage}}
Leistungen:
{{#each metadata.coverage.included}}
✓ {{this}}
{{/each}}

{{#if metadata.coverage.excluded}}
Nicht enthalten:
{{#each metadata.coverage.excluded}}
✗ {{this}}
{{/each}}
{{/if}}
{{/if}}`,
      labels: {
        title: 'Medizinische Information',
        description: 'Medizinische Details und Hinweise'
      }
    },
    service: {
      type: 'service',
      template: `Service-Information:

{{context}}

{{#if metadata.requirements}}
Voraussetzungen:
{{#each metadata.requirements}}
- {{this}}
{{/each}}
{{/if}}

{{#if metadata.actions}}
Mögliche Aktionen:
{{#each metadata.actions}}
- {{label}}: {{url}}
{{/each}}
{{/if}}`,
      labels: {
        title: 'Service',
        description: 'Service-Informationen und Aktionen'
      }
    }
  }

  constructor(config: GeneratorConfig) {
    this.openai = config.openai
    this.anthropic = config.anthropic
    this.temperature = config.temperature ?? 0.7
    this.maxTokens = config.maxTokens ?? 1000
  }

  public async generateResponse(
    context: SearchContext,
    results: SearchResult[],
    type: ContentType,
    analysis: QueryAnalysis
  ): Promise<StructuredResponse> {
    try {
      // Extrahiere relevanten Content
      const relevantContent = this.extractRelevantContent(results)

      // Bereite Metadaten vor
      const metadata = this.prepareMetadata(results, analysis)

      // Generiere strukturierte Antwort
      const text = await this.generateStructuredAnswer(
        context.query,
        relevantContent,
        type,
        metadata
      )

      return {
        type,
        text,
        metadata
      }
    } catch (error) {
      console.error('Fehler bei der Antwortgenerierung:', error)
      throw error
    }
  }

  private extractRelevantContent(results: SearchResult[]): string {
    return results
      .map(result => {
        const snippets = result.snippets
          ?.map(s => s.text)
          .join('\n') || ''
        
        return `${result.title}\n${snippets}`
      })
      .join('\n\n')
  }

  private prepareMetadata(
    results: SearchResult[],
    analysis: QueryAnalysis
  ): TemplateVariables['metadata'] {
    const result = results[0]
    if (!result) return {}

    const metadata: TemplateVariables['metadata'] = {
      title: result.metadata.title,
      description: result.metadata.description,
      requirements: result.metadata.requirements || [],
      costs: result.metadata.costs,
      coverage: result.metadata.coverage ? {
        included: result.metadata.coverage.included || [],
        excluded: result.metadata.coverage.excluded || [],
        conditions: result.metadata.coverage.conditions || []
      } : undefined,
      actions: result.metadata.actions?.map(action => ({
        ...action,
        type: action.type || 'link',
        priority: action.priority || 1
      })) || [],
      sources: results.map(r => ({
        url: r.url,
        title: r.title,
        snippets: r.snippets
      }))
    }

    return metadata
  }

  private async generateStructuredAnswer(
    query: string,
    context: string,
    type: ContentType,
    metadata: TemplateVariables['metadata']
  ): Promise<string> {
    const template = this.templates[type]
    if (!template) {
      throw new Error(`Kein Template für Typ ${type} gefunden`)
    }

    // Bereite die Variablen für das Template vor
    const variables: TemplateVariables = {
      query,
      context,
      metadata
    }

    // Generiere die Antwort mit OpenAI
    const prompt = `Generiere eine strukturierte Antwort basierend auf folgendem Template und Variablen:

Template:
${template.template}

Variablen:
${JSON.stringify(variables, null, 2)}

Die Antwort sollte:
- Informativ und hilfreich sein
- Gut strukturiert und lesbar sein
- Relevante Details aus dem Kontext enthalten
- Die Metadaten sinnvoll einbinden

Generierte Antwort:`

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: this.temperature,
      max_tokens: this.maxTokens
    })

    return completion.choices[0].message.content || 'Keine Antwort generiert'
  }
} 