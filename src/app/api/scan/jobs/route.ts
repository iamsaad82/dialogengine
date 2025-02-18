import { NextRequest, NextResponse } from 'next/server'
import { getRedisInstance, isRedisEnabled } from '@/lib/redis'

export async function GET(request: NextRequest) {
  if (!isRedisEnabled()) {
    return NextResponse.json(
      { error: 'Redis ist nicht aktiviert' },
      { status: 500 }
    )
  }

  const redis = getRedisInstance()
  const templateId = request.nextUrl.searchParams.get('templateId')

  try {
    const keys = await redis.keys('scan:*')
    const jobs = []
    const processedJobIds = new Set()
    const now = Date.now()
    const TWO_HOURS = 2 * 60 * 60 * 1000 // 2 Stunden in Millisekunden

    for (const key of keys) {
      try {
        if (key.endsWith(':url') || key.endsWith(':templateId')) continue
        
        const jobId = key.replace('scan:', '')
        if (processedJobIds.has(jobId)) continue
        processedJobIds.add(jobId)

        const [status, url, jobTemplateId, timestamp] = await Promise.all([
          redis.get(key),
          redis.get(`scan:${jobId}:url`),
          redis.get(`scan:${jobId}:templateId`),
          redis.get(`scan:${jobId}:timestamp`)
        ])

        // Lösche alte Jobs
        const jobTimestamp = timestamp ? parseInt(timestamp) : now
        if (now - jobTimestamp > TWO_HOURS) {
          console.log('Lösche alten Job:', jobId)
          await Promise.all([
            redis.del(`scan:${jobId}`),
            redis.del(`scan:${jobId}:url`),
            redis.del(`scan:${jobId}:templateId`),
            redis.del(`scan:${jobId}:timestamp`)
          ])
          continue
        }

        // Überspringe Jobs anderer Templates
        if (templateId && jobTemplateId !== templateId) {
          continue
        }

        // Lösche ungültige Jobs
        if (jobId === 'undefined' || !status) {
          console.log('Lösche ungültigen Job:', jobId)
          await Promise.all([
            redis.del(`scan:${jobId}`),
            redis.del(`scan:${jobId}:url`),
            redis.del(`scan:${jobId}:templateId`),
            redis.del(`scan:${jobId}:timestamp`)
          ])
          continue
        }

        try {
          const parsedStatus = typeof status === 'string' ? JSON.parse(status) : status
          jobs.push({
            jobId,
            url,
            templateId: jobTemplateId,
            ...parsedStatus
          })
        } catch (parseError) {
          console.error(`Fehler beim Parsen des Status für Job ${jobId}:`, parseError)
          await Promise.all([
            redis.del(`scan:${jobId}`),
            redis.del(`scan:${jobId}:url`),
            redis.del(`scan:${jobId}:templateId`),
            redis.del(`scan:${jobId}:timestamp`)
          ])
        }
      } catch (jobError) {
        console.error('Fehler bei der Verarbeitung des Jobs:', jobError)
      }
    }

    return NextResponse.json(jobs)
  } catch (error) {
    console.error('Fehler beim Abrufen der Jobs:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
} 