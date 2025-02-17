import { NextResponse } from 'next/server'
import { ContentVectorizer } from '@/lib/services/vectorizer'

interface Action {
  type: 'link' | 'form' | 'download' | 'contact'
  label: string
  url: string
  priority: number
}

interface ContactPoint {
  type: string
  value: string
  description?: string
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const templateId = url.searchParams.get('templateId')

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template-ID ist erforderlich' },
        { status: 400 }
      )
    }

    console.log('Suche Dokumente für Template:', templateId)

    const vectorizer = new ContentVectorizer({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      pineconeApiKey: process.env.PINECONE_API_KEY!,
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT!,
      pineconeHost: process.env.PINECONE_HOST!,
      pineconeIndex: `dialog-engine-${templateId}`,
      templateId
    })

    // Hole alle Dokumente für dieses Template
    const results = await vectorizer.getAllDocuments(templateId)
    
    console.log('Gefundene Dokumente:', {
      count: results.length,
      templateId,
      urls: results.map(r => r.metadata.url)
    })

    // Extrahiere interaktive Elemente und Medien
    const processedResults = results.map(r => {
      const metadata = r.metadata
      const actions = (metadata.actions || []) as Action[]
      const contactPoints = (metadata.contactPoints || []) as ContactPoint[]

      const interactiveElements = {
        links: actions.filter(a => a.type === 'link'),
        forms: actions.filter(a => a.type === 'form'),
        downloads: actions.filter(a => a.type === 'download'),
        contacts: actions.filter(a => a.type === 'contact'),
        contactPoints
      }

      const media = {
        hasImages: metadata.hasImages || false,
        images: [], // Hier könnten wir Bild-URLs extrahieren
        documents: actions
          .filter(a => a.type === 'download')
          .map(d => ({
            url: d.url,
            title: d.label,
            type: d.url.split('.').pop() || 'unknown'
          }))
      }

      return {
        id: r.metadata.id || '',
        url: r.metadata.url,
        title: r.metadata.title,
        text: r.text,
        type: r.metadata.contentType,
        content: r.metadata.content,
        metadata: {
          ...r.metadata,
          section: metadata.section,
          sectionLevel: metadata.sectionLevel,
          isMainSection: metadata.isMainSection,
          requirements: metadata.requirements || [],
          nextSteps: metadata.nextSteps || [],
          relatedTopics: metadata.relatedTopics || [],
          deadlines: metadata.deadlines || []
        },
        interactiveElements,
        media,
        score: r.score
      }
    })

    return NextResponse.json({
      message: 'Dokumente erfolgreich geladen',
      resultsCount: results.length,
      results: processedResults
    })
  } catch (error) {
    console.error('Fehler beim Laden der Dokumente:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Dokumente' },
      { status: 500 }
    )
  }
} 