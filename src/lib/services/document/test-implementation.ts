import { OpenAI } from 'openai';
import { HandlerGenerator } from '../../handlers/HandlerGenerator';
import { ContentMetadata } from '../../types/ContentMetadata';
import { SchemaDefinition } from '../../types/schema';
import { BaseHandler } from '../../handlers/BaseHandler';
import { HandlerResponse } from '../../types/responses';

interface TestConfig {
  templateId: string;
  content: string;
  openaiApiKey: string;
}

export class DynamicHandlerTest {
  private openai: OpenAI;
  private handlerGenerator: HandlerGenerator;

  constructor(private config: TestConfig) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.handlerGenerator = new HandlerGenerator();
  }

  async analyzeContent(): Promise<{
    type: string;
    schema: SchemaDefinition;
    metadata: ContentMetadata;
  }> {
    // Analysiere den Content mit OpenAI
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "system",
        content: "Analysiere den folgenden Content und extrahiere Typ, Schema und Metadaten. Antworte im JSON-Format."
      }, {
        role: "user",
        content: this.config.content
      }],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("Keine Antwort von OpenAI erhalten");
    }

    const result = JSON.parse(content);

    return {
      type: result.type,
      schema: result.schema,
      metadata: {
        type: result.type,
        title: result.metadata.title,
        description: result.metadata.description,
        requirements: result.metadata.requirements,
        template: this.config.templateId,
        lastUpdated: new Date().toISOString()
      }
    };
  }

  async generateHandler(): Promise<BaseHandler> {
    // Analysiere zuerst den Content
    const analysis = await this.analyzeContent();
    
    // Generiere Handler basierend auf den Metadaten
    return this.handlerGenerator.generateHandler(analysis.metadata);
  }

  async testHandler(query: string): Promise<HandlerResponse> {
    const handler = await this.generateHandler();
    return handler.handleSearch(query);
  }
} 