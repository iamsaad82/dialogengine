import { NextResponse } from 'next/server'
import { SchemaGenerator } from '@/lib/services/schema/schema-generator'
import { ContentAnalyzer } from '@/lib/services/upload/handlers/content-analyzer'
import { OpenAIService } from '@/lib/services/ai/openai'
import { ContentTypeRegistryService } from '@/lib/services/registry/content-type-registry'

// Initialisiere Services
const openai = new OpenAIService({ 
  apiKey: process.env.OPENAI_API_KEY || '',
  registry: new ContentTypeRegistryService()
})

const analyzer = new ContentAnalyzer(openai)
const generator = new SchemaGenerator()

export async function POST(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const { content } = await request.json()

    if (!content) {
      return NextResponse.json(
        { error: 'Kein Content gefunden' },
        { status: 400 }
      )
    }

    // Analysiere den Content
    const analysis = await analyzer.analyzeContent(content)
    
    // Extrahiere Themenbereiche
    const sections = await analyzer.detectTopicSections(content)
    
    // Generiere Schema aus der Analyse
    const schema = await generator.generateFromAnalysis(
      params.templateId,
      analysis,
      sections
    )

    return NextResponse.json(schema)
  } catch (error) {
    console.error('Fehler bei der Schema-Analyse:', error)
    return NextResponse.json(
      { error: 'Fehler bei der Schema-Analyse' },
      { status: 500 }
    )
  }
} 