import { NextResponse } from 'next/server';
import { DynamicHandlerTest } from '@/lib/services/document/test-implementation';

export async function POST(request: Request) {
  try {
    const { content, templateId } = await request.json();

    if (!content || !templateId) {
      return NextResponse.json(
        { error: 'Content and templateId are required' },
        { status: 400 }
      );
    }

    const test = new DynamicHandlerTest({
      content,
      templateId,
      openaiApiKey: process.env.OPENAI_API_KEY || ''
    });

    // 1. Analyze content
    const analysis = await test.analyzeContent();
    
    // 2. Generate handler
    const handler = await test.generateHandler();
    
    // 3. Generate test response
    const response = await handler.generateResponse({
      query: "Test query",
      templateId,
      metadata: analysis.metadata
    });

    return NextResponse.json({
      analysis,
      response
    });
    
  } catch (error) {
    console.error('Error in dynamic handler test:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 