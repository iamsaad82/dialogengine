import { Pinecone } from '@pinecone-database/pinecone'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Lade Umgebungsvariablen
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '..', '.env.local')
dotenv.config({ path: envPath })

const TEMPLATE_ID = 'cm6voqaz40004yw0aon09wrhq'
const INDEX_NAME = process.env.PINECONE_INDEX || 'dialog-engine'

async function verifyIndex() {
  try {
    console.log('Starte Index-Verifizierung...\n')
    
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || ''
    })

    const index = pinecone.index(INDEX_NAME)
    
    // 1. Prüfe Index-Statistiken
    console.log('1. Index-Statistiken:')
    const stats = await index.describeIndexStats()
    console.log('- Gesamtzahl Vektoren:', stats.totalRecordCount)
    console.log('- Dimensionen:', stats.dimension)
    
    // 2. Prüfe Template-spezifische Statistiken
    console.log('\n2. Template-spezifische Statistiken:')
    const templateStats = await index.describeIndexStats({
      filter: {
        templateId: { $eq: TEMPLATE_ID }
      }
    })
    console.log('- Vektoren für Template:', templateStats.totalRecordCount)
    
    // 3. Prüfe Metadaten-Verteilung
    console.log('\n3. Metadaten-Analyse:')
    const dummyVector = Array(1536).fill(0)
    const sampleSize = 10
    
    const sampleResults = await index.query({
      vector: dummyVector,
      topK: sampleSize,
      filter: {
        templateId: { $eq: TEMPLATE_ID }
      },
      includeMetadata: true
    })
    
    const metadataFields = new Set()
    const contentTypes = new Set()
    let hasLargeMetadata = false
    
    sampleResults.matches.forEach(match => {
      if (match.metadata) {
        // Sammle alle Metadaten-Felder
        Object.keys(match.metadata).forEach(key => metadataFields.add(key))
        
        // Prüfe Content-Types
        if (match.metadata.contentType) {
          contentTypes.add(match.metadata.contentType)
        }
        
        // Prüfe Metadaten-Größe
        const metadataSize = Buffer.from(JSON.stringify(match.metadata)).length
        if (metadataSize > 30000) { // Warnung bei 75% des Limits
          hasLargeMetadata = true
          console.log(`- Warnung: Große Metadaten gefunden (${metadataSize} Bytes) für ID ${match.id}`)
        }
      }
    })
    
    console.log('- Gefundene Metadaten-Felder:', Array.from(metadataFields))
    console.log('- Gefundene Content-Types:', Array.from(contentTypes))
    if (!hasLargeMetadata) {
      console.log('- Alle geprüften Metadaten sind innerhalb der Größenlimits')
    }
    
    // 4. Prüfe Link-Strukturen
    console.log('\n4. Link-Struktur-Analyse:')
    let hasValidLinks = true
    
    for (const match of sampleResults.matches) {
      if (match.metadata?.linksJson) {
        try {
          const links = JSON.parse(match.metadata.linksJson)
          if (!links.images || !links.videos || !links.documents || !links.references) {
            console.log(`- Warnung: Unvollständige Link-Struktur in ID ${match.id}`)
            hasValidLinks = false
          }
        } catch (error) {
          console.log(`- Fehler: Ungültiges linksJson Format in ID ${match.id}`)
          hasValidLinks = false
        }
      }
    }
    
    if (hasValidLinks) {
      console.log('- Alle geprüften Link-Strukturen sind valide')
    }
    
    // 5. Prüfe Chunk-Konsistenz
    console.log('\n5. Chunk-Konsistenz:')
    const urlMap = new Map()
    
    sampleResults.matches.forEach(match => {
      const metadata = match.metadata
      if (metadata?.url && metadata?.chunkIndex !== undefined && metadata?.totalChunks !== undefined) {
        if (!urlMap.has(metadata.url)) {
          urlMap.set(metadata.url, new Set())
        }
        urlMap.get(metadata.url).add(metadata.chunkIndex)
      }
    })
    
    urlMap.forEach((chunks, url) => {
      console.log(`- ${url}: ${chunks.size} Chunks gefunden`)
    })
    
    console.log('\nVerifizierung abgeschlossen!')
  } catch (error) {
    console.error('Fehler bei der Verifizierung:', error)
    process.exit(1)
  }
}

verifyIndex() 