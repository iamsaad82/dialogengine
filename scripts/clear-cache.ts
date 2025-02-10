import { config } from 'dotenv'
import { Redis } from 'ioredis'

// Lade Umgebungsvariablen
config({ path: '.env.development' })

const REDIS_URL = process.env.REDIS_URL || ''

if (!REDIS_URL) {
  console.error('Fehlende Redis-URL!')
  process.exit(1)
}

async function clearCache() {
  let redis: Redis | null = null
  
  try {
    console.log('Verbinde mit Redis...')
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('Redis-Verbindung fehlgeschlagen nach 3 Versuchen')
          return null
        }
        return Math.min(times * 1000, 3000)
      }
    })

    // Prüfe die Verbindung
    await redis.ping()
    console.log('Redis-Verbindung erfolgreich hergestellt')

    // Hole alle Keys
    console.log('Suche Cache-Einträge...')
    const keys = await redis.keys('*')
    
    if (keys.length === 0) {
      console.log('Keine Cache-Einträge gefunden.')
      process.exit(0)
    }

    console.log(`Gefunden: ${keys.length} Cache-Einträge`)
    console.log('Lösche Cache-Einträge...')
    
    // Lösche alle Keys
    if (keys.length > 0) {
      await redis.del(...keys)
    }

    console.log('Cache erfolgreich geleert!')
    process.exit(0)
  } catch (error) {
    console.error('Fehler beim Leeren des Caches:', error)
    process.exit(1)
  } finally {
    if (redis) {
      console.log('Schließe Redis-Verbindung...')
      await redis.quit()
    }
  }
}

clearCache() 