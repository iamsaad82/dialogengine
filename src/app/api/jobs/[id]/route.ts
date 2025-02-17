import { NextRequest, NextResponse } from 'next/server'
import { JobManager } from '@/lib/services/jobManager'

const jobManager = new JobManager(process.env.REDIS_URL || '')

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[API] GET /api/jobs/[id] aufgerufen:', params.id)
  try {
    const job = await jobManager.getJob(params.id)
    
    if (!job) {
      console.log('[API] Job nicht gefunden:', params.id)
      return NextResponse.json(
        { error: 'Job nicht gefunden' },
        { status: 404 }
      )
    }

    console.log('[API] Job gefunden:', job.status)
    return NextResponse.json(job)
  } catch (error) {
    console.error('[API] Fehler beim Abrufen des Jobs:', error)
    return NextResponse.json(
      { 
        error: 'Fehler beim Abrufen des Jobs',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await jobManager.deleteJob(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Löschen des Jobs:', error)
    return NextResponse.json(
      { 
        error: 'Fehler beim Löschen des Jobs',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const update = await request.json()
    update.jobId = params.id

    const job = await jobManager.updateJob(update)
    return NextResponse.json(job)
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Jobs:', error)
    return NextResponse.json(
      { 
        error: 'Fehler beim Aktualisieren des Jobs',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
} 