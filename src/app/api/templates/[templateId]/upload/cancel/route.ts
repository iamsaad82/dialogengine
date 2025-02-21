import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const { jobId } = await request.json()

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID fehlt' },
        { status: 400 }
      )
    }

    const job = await prisma.uploadJob.findUnique({
      where: { id: jobId }
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job nicht gefunden' },
        { status: 404 }
      )
    }

    // Aktualisiere den Job-Status auf "cancelled"
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: 'cancelled',
        metadata: {
          ...job.metadata,
          cancelledAt: new Date().toISOString(),
          processingDetails: {
            stage: 'cancelled',
            message: 'Upload-Vorgang wurde manuell abgebrochen'
          }
        }
      }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Job wurde erfolgreich abgebrochen'
    })
  } catch (error) {
    console.error('Fehler beim Abbrechen des Upload-Jobs:', error)
    return NextResponse.json(
      { error: 'Fehler beim Abbrechen des Jobs' },
      { status: 500 }
    )
  }
} 