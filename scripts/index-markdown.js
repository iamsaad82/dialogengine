import { Pinecone } from '@pinecone-database/pinecone'
import { OpenAI } from 'openai'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// Lade Umgebungsvariablen aus der .env.local-Datei im Projektroot
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '..', '.env.local')
dotenv.config({ path: envPath })

// Prüfe, ob die erforderlichen Umgebungsvariablen vorhanden sind
const requiredEnvVars = ['OPENAI_API_KEY', 'PINECONE_API_KEY']
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Fehler: ${envVar} ist nicht in der .env.local-Datei definiert`)
    process.exit(1)
  }
}

const TEMPLATE_ID = process.env.TEMPLATE_ID || 'default'
const INDEX_NAME = 'dialog-engine'
const MARKDOWN_DIR = process.env.MARKDOWN_DIR ? join(process.cwd(), process.env.MARKDOWN_DIR) : join(process.cwd(), 'data', 'scans', TEMPLATE_ID)
const MARKDOWN_FILE = process.env.MARKDOWN_FILE
const MAX_CHUNK_SIZE = 4000 // Maximale Anzahl von Zeichen pro Chunk
const OVERLAP_SIZE = 200 // Anzahl der Zeichen für Überlappung

// Extrahiere und kategorisiere Links aus dem Text
function extractLinks(text) {
  const links = {
    images: [],     // Array von { url: string, alt?: string }
    videos: [],     // Array von { url: string, platform?: string }
    documents: [],  // Array von { url: string, type: string, title?: string }
    references: []  // Array von { url: string, title: string }
  }

  // Temporärer Text für die Verarbeitung
  let cleanText = text

  // Extrahiere Bild-Links: ![alt](url)
  cleanText = cleanText.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
    links.images.push({ url, alt })
    return alt || '' // Behalte den Alt-Text im Content
  })

  // Extrahiere Video-Links (YouTube, Vimeo etc.)
  cleanText = cleanText.replace(/\[([^\]]+)\]\((https?:\/\/(www\.)?(youtube\.com|vimeo\.com)[^)]+)\)/g, (match, title, url) => {
    const platform = url.includes('youtube') ? 'youtube' : 'vimeo'
    links.videos.push({ url, platform })
    return title // Behalte den Titel im Content
  })

  // Extrahiere Dokument-Links (PDF, DOC etc.)
  cleanText = cleanText.replace(/\[([^\]]+)\]\(([^)]+\.(pdf|doc|docx|xls|xlsx))\)/g, (match, title, url, type) => {
    links.documents.push({ url, type, title })
    return title // Behalte den Titel im Content
  })

  // Extrahiere normale Referenz-Links
  cleanText = cleanText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, title, url) => {
    // Ignoriere bereits verarbeitete spezielle Links
    if (!links.images.some(img => img.url === url) &&
        !links.videos.some(vid => vid.url === url) &&
        !links.documents.some(doc => doc.url === url)) {
      links.references.push({ url, title })
    }
    return title // Behalte den Titel im Content
  })

  return { cleanText, links }
}

// Bereinige Markdown-Text
function cleanMarkdown(text) {
  // Entferne unnötige Abschnitte
  const unwantedSections = [
    'Waren diese Informationen hilfreich für Sie?',
    'Teilen',
    'Postleitzahl speichern',
    'Newsletter abonnieren',
    'Kontakt',
    'Impressum',
    'Datenschutz'
  ]
  
  for (const section of unwantedSections) {
    text = text.replace(new RegExp(`${section}[\\s\\S]*?(?=##|$)`, 'g'), '')
  }
  
  // Entferne überflüssige Leerzeichen und Zeilenumbrüche
  text = text.replace(/\n{3,}/g, '\n\n')
  text = text.trim()
  
  return text
}

// Extrahiere Kategorie aus Dateiname und Inhalt
function extractCategory(filename, content) {
  const categories = {
    leistungen: ['leistung', 'behandlung', 'therapie', 'vorsorge'],
    infos: ['info', 'ratgeber', 'wissen'],
    services: ['service', 'angebot', 'kontakt']
  }
  
  const lowerContent = content.toLowerCase()
  const lowerFilename = filename.toLowerCase()
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowerFilename.includes(keyword) || lowerContent.includes(keyword))) {
      return category
    }
  }
  
  return 'other'
}

// Teile Text in semantische Chunks
function splitIntoSemanticChunks(text, maxChunkSize, overlapSize) {
  const chunks = []
  const sections = text.split(/(?=#{2,3}\s)/) // Teile bei ## oder ###
  
  for (const section of sections) {
    if (section.length <= maxChunkSize) {
      chunks.push(section)
      continue
    }
    
    // Teile lange Abschnitte in kleinere Chunks
    let startIndex = 0
    while (startIndex < section.length) {
      const endIndex = Math.min(startIndex + maxChunkSize, section.length)
      const chunk = section.slice(startIndex, endIndex)
      
      // Füge Überlappung hinzu
      if (startIndex > 0) {
        const overlap = section.slice(Math.max(0, startIndex - overlapSize), startIndex)
        chunks.push(overlap + chunk)
      } else {
        chunks.push(chunk)
      }
      
      startIndex += maxChunkSize - overlapSize
    }
  }
  
  return chunks
}

async function indexMarkdownFiles() {
  try {
    console.log(`Indexiere Markdown-Dateien aus ${MARKDOWN_DIR}...`)
    console.log('Verwende Index:', INDEX_NAME)
    
    // Initialisiere OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    
    // Initialisiere Pinecone
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    })
    
    const index = pinecone.index(INDEX_NAME)
    
    let mdFiles = []
    
    if (MARKDOWN_FILE) {
      // Verarbeite nur die angegebene Datei
      mdFiles = [MARKDOWN_FILE]
      console.log(`Verarbeite einzelne Datei: ${MARKDOWN_FILE}`)
    } else {
      // Lese alle Markdown-Dateien
      const files = await readdir(MARKDOWN_DIR)
      mdFiles = files.filter(file => file.endsWith('.md'))
      console.log(`Gefunden: ${mdFiles.length} Markdown-Dateien`)
    }
    
    // Verarbeite jede Datei
    for (const file of mdFiles) {
      const filePath = join(MARKDOWN_DIR, file)
      let content = await readFile(filePath, 'utf-8')
      
      console.log(`\nVerarbeite ${file}...`)
      
      // Extrahiere Links und bereinige Text
      const { cleanText, links } = extractLinks(content)
      
      // Bereinige den Markdown-Text weiter
      content = cleanMarkdown(cleanText)
      
      // Bestimme die Kategorie
      const category = extractCategory(file, content)
      
      // Teile den Inhalt in semantische Chunks
      const chunks = splitIntoSemanticChunks(content, MAX_CHUNK_SIZE, OVERLAP_SIZE)
      console.log(`Aufgeteilt in ${chunks.length} semantische Chunks`)
      
      // Verarbeite jeden Chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        console.log(`Verarbeite Chunk ${i + 1}/${chunks.length}...`)
        
        try {
          // Erstelle Embedding
          const embedding = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: chunk
          })
          
          // Bereite Metadaten vor - Optimierte Größe
          const metadata = {
            templateId: TEMPLATE_ID,
            url: file.replace('.md', ''),
            title: file.replace('.md', '').split('_').join(' '),
            content: chunk.slice(0, 8000), // Begrenze Content-Länge
            contentType: category,
            language: 'de',
            lastModified: new Date().toISOString(),
            chunkIndex: i,
            totalChunks: chunks.length,
            hasOverlap: i > 0,
            // Speichere nur die wichtigsten Link-Informationen
            linksJson: JSON.stringify({
              images: links.images.map(img => ({ url: img.url })),
              videos: links.videos.map(vid => ({ url: vid.url, platform: vid.platform })),
              documents: links.documents.map(doc => ({ url: doc.url, type: doc.type })),
              references: links.references.map(ref => ({ url: ref.url }))
            })
          }
          
          // Prüfe Metadaten-Größe
          const metadataSize = Buffer.from(JSON.stringify(metadata)).length
          if (metadataSize > 40000) {
            console.warn(`Warnung: Metadaten-Größe (${metadataSize} Bytes) nähert sich dem Limit von 40960 Bytes`)
            // Kürze Content weiter, falls nötig
            metadata.content = metadata.content.slice(0, 4000)
          }
          
          // Speichere in Pinecone
          const vector = {
            id: `${TEMPLATE_ID}:${file}:chunk${i}`,
            values: embedding.data[0].embedding,
            metadata
          }
          
          await index.upsert([vector])
          
          console.log(`Chunk ${i + 1}/${chunks.length} erfolgreich indexiert`)
        } catch (error) {
          console.error(`Fehler beim Verarbeiten von Chunk ${i + 1}/${chunks.length}:`, error)
          throw error
        }
      }
      
      console.log(`${file} erfolgreich indexiert`)
    }
    
    console.log('\nAlle Dateien wurden erfolgreich indexiert')
  } catch (error) {
    console.error('Fehler beim Indexieren:', error)
    process.exit(1)
  }
}

indexMarkdownFiles() 