import { NextResponse } from 'next/server'
import { ContentProcessor } from '@/lib/services/upload/content/processor'
import { ContentAnalyzer } from '@/lib/services/upload/handlers/content-analyzer'
import { HandlerGenerator } from '@/lib/services/upload/handlers/handler-generator'
import { VectorManager } from '@/lib/services/upload/handlers/vector-manager'
import { JobManager } from '@/lib/services/upload/jobs/job-manager'
import { ContentTypeRegistryService } from '@/lib/services/registry/content-type-registry'
import { OpenAIService } from '@/lib/services/ai/openai'
import { UploadProcessor } from './processors/upload-processor'

// Initialisiere Services
const openai = new OpenAIService({ 
  apiKey: process.env.OPENAI_API_KEY || '',
  registry: new ContentTypeRegistryService()
})

const contentProcessor = new ContentProcessor()
const contentAnalyzer = new ContentAnalyzer(openai)
const handlerGenerator = new HandlerGenerator()
const jobManager = new JobManager()

export async function POST(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Keine Dateien gefunden' },
        { status: 400 }
      )
    }

    // Erstelle einen neuen Upload-Job
    const jobId = await jobManager.createJob(params.templateId, files)

    // Initialisiere VectorManager mit Template-ID
    const vectorManager = new VectorManager({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      pineconeApiKey: process.env.PINECONE_API_KEY || '',
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
      pineconeIndex: process.env.PINECONE_INDEX || '',
      templateId: params.templateId
    })

    // Starte asynchrone Verarbeitung
    const processor = new UploadProcessor(
      contentProcessor,
      contentAnalyzer,
      handlerGenerator,
      vectorManager,
      jobManager
    )

    processor.processUpload(jobId, files, params.templateId).catch(error => {
      console.error('Fehler bei der Verarbeitung:', error)
    })

    return NextResponse.json({ jobId })
  } catch (error) {
    console.error('Fehler beim Upload:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID fehlt' },
        { status: 400 }
      )
    }

    const status = await jobManager.getJobStatus(jobId)
    return NextResponse.json(status)
  } catch (error) {
    console.error('Fehler beim Abrufen des Status:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 