import { NextRequest, NextResponse } from 'next/server'
import { JobManager } from '@/lib/services/jobManager'

const jobManager = new JobManager()

export async function POST(request: NextRequest) {
  try {
    const { templateId, files } = await request.json()

    if (!templateId || !files?.length) {
      return NextResponse.json(
        { error: 'Template-ID und Dateien sind erforderlich' },
        { status: 400 }
      )
    }

    const job = await jobManager.createJob(templateId, files)
    
    return NextResponse.json(job)
  } catch (error) {
    console.error('Fehler beim Erstellen des Jobs:', error)
    return NextResponse.json(
      { 
        error: 'Fehler beim Erstellen des Jobs',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const templateId = url.searchParams.get('templateId')

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template-ID ist erforderlich' },
        { status: 400 }
      )
    }

    const jobs = await jobManager.listJobs(templateId)
    return NextResponse.json(jobs)
  } catch (error) {
    console.error('Fehler beim Abrufen der Jobs:', error)
    return NextResponse.json(
      { 
        error: 'Fehler beim Abrufen der Jobs',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
} 