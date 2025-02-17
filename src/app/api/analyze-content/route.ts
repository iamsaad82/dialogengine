import { NextResponse } from 'next/server';
import { SmartSearch } from '@/lib/services/search/core/search';
import { DynamicHandlerAnalyzer } from '@/lib/services/document/DynamicHandlerAnalyzer';

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const { content, templateId } = await request.json();

    if (!content || !templateId) {
      return NextResponse.json(
        { error: 'Content und templateId sind erforderlich' },
        { status: 400 }
      );
    }

    // SmartSearch initialisieren
    const smartSearch = new SmartSearch(
      templateId,
      {
        openaiApiKey: process.env.OPENAI_API_KEY || '',
        pineconeApiKey: process.env.PINECONE_API_KEY || '',
        pineconeIndex: process.env.PINECONE_INDEX || '',
        pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
        templateId: templateId,
        language: 'de'
      }
    );

    // Analyzer initialisieren
    const analyzer = new DynamicHandlerAnalyzer(smartSearch);

    // Content analysieren
    console.log('Starte Content-Analyse...');
    const analysis = await analyzer.analyzeContent(content, templateId);
    console.log('Content-Analyse abgeschlossen:', analysis);

    // Test-Antwort generieren
    console.log('Generiere Antwort...');
    const searchResponse = await smartSearch.search({
      query: "Generiere eine Test-Antwort basierend auf dem analysierten Content",
      templateId,
      metadata: {
        ...analysis.metadata,
        schema: analysis.schema
      }
    });
    console.log('Antwort generiert:', searchResponse);

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    return NextResponse.json({
      schema: analysis.schema,
      metadata: analysis.metadata,
      response: {
        text: searchResponse.answer,
        confidence: searchResponse.confidence,
        processingTime
      }
    });

  } catch (error) {
    console.error('Fehler bei der Content-Analyse:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
} 