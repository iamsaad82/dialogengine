import { OpenAI } from 'openai'
import { Pinecone, RecordMetadata } from '@pinecone-database/pinecone'
import { v4 as uuidv4 } from 'uuid'

// Definiere ContentType direkt hier
export type ContentType = 
  | 'info' 
  | 'service' 
  | 'medical'
  | 'insurance'
  | 'location' 
  | 'contact' 
  | 'faq' 
  | 'download' 
  | 'error';

export interface VectorizerConfig {
  openaiApiKey: string
  pineconeApiKey: string
  pineconeEnvironment: string
  pineconeIndex: string
  pineconeHost?: string
  templateId: string
}

interface DocumentMetadata extends RecordMetadata {
  url: string
  title: string
  text: string
  content: string
  contentType: string
  templateId?: string
  language?: string
  lastModified?: string
  [key: string]: any // Für Kompatibilität mit RecordMetadata
}

interface PineconeVector {
  id: string
  values: number[]
  metadata: DocumentMetadata
}

interface BatchProgress {
  totalVectors: number
  processedVectors: number
  currentBatch: number
  totalBatches: number
  status: 'running' | 'completed' | 'failed'
  error?: string
}

interface SearchResult {
  text: string
  score: number
  metadata: DocumentMetadata
}

interface ProcessedChunk {
  id: string
  type: ContentType
  content: string
  metadata: {
    title?: string
    description?: string
    url?: string
    section?: string
    level?: number
    parentDocument: string
    actions?: {
      type: 'link' | 'form' | 'download' | 'contact'
      label: string
      url: string
      priority: number
    }[]
    requirements?: string[]
    nextSteps?: string[]
    relatedTopics?: string[]
    deadlines?: string[]
    contactPoints?: {
      type: string
      value: string
      description?: string
    }[]
    sectionLevel?: number
    sectionIndex?: number
    totalSections?: number
    isMainSection?: boolean
    isSubChunk?: boolean
    subChunkIndex?: number
    totalSubChunks?: number
    hasImages?: boolean
    regions?: string[]
  }
  confidence: number
  embedding: number[]
}

export class ContentVectorizer {
  private openai: OpenAI
  private pinecone: Pinecone
  private readonly indexName: string
  private readonly templateId: string
  private readonly batchSize: number = 40
  private readonly host: string

  constructor(config: VectorizerConfig) {
    if (!config.openaiApiKey) {
      throw new Error('OpenAI API Key ist erforderlich')
    }
    if (!config.pineconeApiKey) {
      throw new Error('Pinecone API Key ist erforderlich')
    }
    if (!config.pineconeEnvironment) {
      throw new Error('Pinecone Environment ist erforderlich')
    }
    if (!config.pineconeIndex) {
      throw new Error('Pinecone Index ist erforderlich')
    }

    this.openai = new OpenAI({
      apiKey: config.openaiApiKey
    })

    // Pinecone-Client mit minimaler Konfiguration
    this.pinecone = new Pinecone({
      apiKey: config.pineconeApiKey
    })

    this.indexName = config.pineconeIndex || process.env.PINECONE_INDEX || 'dialog-engine'
    this.host = config.pineconeHost || process.env.PINECONE_HOST || ''
    this.templateId = config.templateId
    console.log('ContentVectorizer initialisiert mit Index:', this.indexName)
  }

  private async validateIndex(): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName)
      const stats = await index.describeIndexStats()
      console.log('Index-Validierung erfolgreich:', {
        indexName: this.indexName,
        totalVectors: stats.totalRecordCount,
        dimensions: stats.dimension
      })
    } catch (error) {
      console.error('Index-Validierung fehlgeschlagen:', error)
      throw new Error(`Index-Validierung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    if (!text) {
      throw new Error('Text für Embedding darf nicht leer sein')
    }

    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000) // Begrenzen auf 8000 Zeichen
    })
    return response.data[0].embedding
  }

  private async processBatch(
    batch: PineconeVector[],
    currentBatch: number,
    totalBatches: number
  ): Promise<void> {
    if (!batch || batch.length === 0) {
      console.log('Überspringe leeren Batch')
      return
    }

    try {
      const index = this.pinecone.index(this.indexName)
      
      console.log(`Verarbeite Batch ${currentBatch}/${totalBatches} mit ${batch.length} Vektoren`)
      
      // Validiere die Vektoren vor dem Upsert
      const validVectors = batch.filter(vector => {
        if (!vector.id || !vector.values || !vector.metadata) {
          console.warn('Ungültiger Vektor gefunden:', vector)
          return false
        }
        return true
      })

      if (validVectors.length === 0) {
        console.warn('Keine gültigen Vektoren im Batch gefunden')
        return
      }

      // Bereite die Vektoren für den Upsert vor
      const vectors = validVectors.map(vector => ({
        id: vector.id,
        values: vector.values,
        metadata: {
          ...vector.metadata,
          templateId: this.templateId,
          lastUpdated: new Date().toISOString()
        }
      }))

      console.log('Sende Upsert-Request an Pinecone:', {
        indexName: this.indexName,
        vectorCount: vectors.length,
        sampleVector: {
          id: vectors[0].id,
          metadataFields: Object.keys(vectors[0].metadata)
        }
      })

      // Führe den Upsert aus
      await index.upsert(vectors)
      
      console.log(`Batch ${currentBatch}/${totalBatches} erfolgreich verarbeitet`)
    } catch (error) {
      console.error('Fehler bei der Batch-Verarbeitung:', error)
      if (error instanceof Error) {
        console.error('Details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        })
      }
      throw error
    }
  }

  private truncateMetadata(metadata: DocumentMetadata): DocumentMetadata {
    const maxContentLength = 2000  // Maximal 2000 Zeichen für den Content
    const maxTextLength = 1000     // Maximal 1000 Zeichen für den Text
    const maxTitleLength = 100     // Maximal 100 Zeichen für den Titel

    // Entferne nicht benötigte Felder
    const {
      content,
      text,
      title,
      url,
      contentType,
      templateId,
      language,
      lastModified,
      ...rest
    } = metadata

    // Behalte nur die wichtigsten Metadaten
    return {
      content: content?.substring(0, maxContentLength) || '',
      text: text?.substring(0, maxTextLength) || '',
      title: title?.substring(0, maxTitleLength) || '',
      url: url || '',
      contentType: contentType || 'info',
      templateId,
      language,
      lastModified
    }
  }

  private validateMetadata(metadata: RecordMetadata | undefined): DocumentMetadata {
    if (!metadata) {
      throw new Error('Metadata ist erforderlich')
    }

    // Korrigiere die URL falls es ein lokaler Pfad ist
    let url = String(metadata.url || '')
    if (url.includes('/Users/') && url.endsWith('.md')) {
      // Extrahiere den relevanten Teil des Pfads
      const match = url.match(/www_aok_de(.+)\.md$/)
      if (match) {
        url = `https://www.aok.de${match[1].replace(/_/g, '/')}`
      }
    }

    const validatedMetadata: DocumentMetadata = {
      url,
      title: String(metadata.title || ''),
      text: String(metadata.text || ''),
      content: String(metadata.content || ''),
      contentType: String(metadata.contentType || 'webpage'),
      templateId: String(metadata.templateId || this.templateId),
      language: String(metadata.language || 'de'),
      lastModified: String(metadata.lastModified || new Date().toISOString())
    }

    return this.truncateMetadata(validatedMetadata)
  }

  private splitIntoSections(content: string): Array<{
    title: string
    content: string
    level: number
  }> {
    console.log('Teile Content in Sektionen auf, Content-Länge:', content.length)
    const sections: Array<{ title: string; content: string; level: number }> = []
    
    // Entferne doppelte Leerzeilen und bereinige den Content
    const cleanContent = content
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    
    if (!cleanContent) {
      console.warn('Leerer Content, überspringe Sektionierung')
      return []
    }

    // Versuche zuerst, die URL aus dem Content zu extrahieren
    const urlMatch = cleanContent.match(/https?:\/\/[^\s)]+/)
    const baseUrl = urlMatch ? urlMatch[0] : ''

    const lines = cleanContent.split('\n')
    let currentSection = { 
      title: baseUrl || 'Hauptinhalt',
      content: '',
      level: 1
    }
    let hasFoundHeadings = false
    
    for (const line of lines) {
      // Ignoriere leere Zeilen am Anfang einer Sektion
      if (!currentSection.content && !line.trim()) {
        continue
      }

      // Prüfe verschiedene Heading-Formate
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/) || 
                          line.match(/^([=]+|[-]+)\s*(.+?)\s*[=|-]+$/)
      
      if (headingMatch) {
        hasFoundHeadings = true
        const newTitle = headingMatch[2].trim()
        // Bestimme Level basierend auf dem Format
        const newLevel = headingMatch[1].startsWith('#') 
          ? headingMatch[1].length 
          : headingMatch[1].startsWith('=') ? 1 : 2

        // Füge die vorherige Sektion hinzu, wenn sie Inhalt hat
        if (currentSection.content.trim()) {
          console.log('Füge Sektion hinzu:', currentSection.title)
          sections.push({
            title: currentSection.title,
            content: currentSection.content.trim(),
            level: currentSection.level
          })
        }

        currentSection = {
          title: newTitle,
          content: '',
          level: newLevel
        }
      } else {
        currentSection.content += line + '\n'
      }
    }
    
    // Füge die letzte Sektion hinzu, wenn sie Inhalt hat
    if (currentSection.content.trim()) {
      console.log('Füge letzte Sektion hinzu:', currentSection.title)
      sections.push({
        title: currentSection.title,
        content: currentSection.content.trim(),
        level: currentSection.level
      })
    }
    
    // Wenn keine Überschriften gefunden wurden und der Content nicht leer ist
    if (!hasFoundHeadings && cleanContent) {
      console.log('Keine Überschriften gefunden, erstelle einzelne Sektion')
      sections.push({
        title: baseUrl || 'Hauptinhalt',
        content: cleanContent,
        level: 1
      })
    }
    
    console.log('Gefundene Sektionen:', sections.length)
    return sections
  }

  private splitLongSection(content: string): string[] {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content]
    const chunks: string[] = []
    let currentChunk = ''

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > 1000) {
        if (currentChunk) {
          chunks.push(currentChunk.trim())
        }
        currentChunk = sentence
      } else {
        currentChunk += ' ' + sentence
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim())
    }

    return chunks
  }

  private async analyzeSection(content: string): Promise<{
    type: ContentType
    confidence: number
    metadata: {
      description?: string
      actions?: Array<{
        type: 'link' | 'form' | 'download' | 'contact'
        label: string
        url: string
        priority: number
      }>
      requirements?: string[]
      nextSteps?: string[]
      relatedTopics?: string[]
      deadlines?: string[]
      contactPoints?: Array<{
        type: string
        value: string
        description?: string
      }>
    }
  }> {
    const prompt = `Analysiere den folgenden Content und extrahiere strukturierte Informationen.
    Berücksichtige dabei:
    - Den Haupt-Content-Type (info, service, product, event, etc.)
    - Mögliche Aktionen (Links, Formulare, Downloads)
    - Anforderungen oder Voraussetzungen
    - Nächste Schritte
    - Verwandte Themen
    - Fristen oder Termine
    - Kontaktmöglichkeiten

    Content:
    ${content}

    Antworte im JSON-Format mit allen gefundenen Informationen.`

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })

    const response = completion.choices[0].message.content
    if (!response) {
      throw new Error('Keine Antwort vom Modell erhalten')
    }

    return JSON.parse(response)
  }

  public async indexContent(
    content: string,
    metadata: Record<string, any>
  ): Promise<ProcessedChunk[]> {
    try {
      console.log('Starte Content-Indexierung...')
      
      // Validiere und bereinige Metadaten
      const validatedMetadata = this.validateMetadata({
        ...metadata,
        templateId: this.templateId,
        text: content,
        lastModified: new Date().toISOString()
      })

      // Verarbeite Markdown-Content
      const chunks = await this.processMarkdownContent(content, validatedMetadata)
      
      if (!chunks || chunks.length === 0) {
        console.log('Keine Chunks zum Indexieren gefunden')
        return []
      }

      console.log(`Gefunden: ${chunks.length} Chunks zum Indexieren`)

      // Bereite Vektoren vor
      const vectors: PineconeVector[] = chunks.map((chunk, index) => ({
        id: `${validatedMetadata.url || 'unknown'}_${index}_${Date.now()}`, // Füge Timestamp hinzu für Eindeutigkeit
        values: chunk.embedding,
        metadata: {
          ...validatedMetadata,
          ...chunk.metadata,
          content: chunk.content,
          type: chunk.type,
          confidence: chunk.confidence,
          lastIndexed: new Date().toISOString() // Füge Indexierungszeitpunkt hinzu
        }
      }))

      // Verarbeite in Batches
      const batchSize = this.batchSize
      const totalBatches = Math.ceil(vectors.length / batchSize)

      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize)
        if (batch.length > 0) {
          await this.processBatch(batch, Math.floor(i / batchSize) + 1, totalBatches)
        }
      }

      console.log('Indexierung erfolgreich abgeschlossen')
      return chunks
    } catch (error) {
      console.error('Fehler bei der Indexierung:', error)
      throw error
    }
  }

  public async searchSimilar(
    query: string, 
    limit = 3, 
    filter?: Record<string, any>
  ): Promise<SearchResult[]> {
    const queryEmbedding = await this.getEmbedding(query)
    const index = this.pinecone.index(this.indexName)

    const results = await index.query({
      vector: queryEmbedding,
      topK: limit,
      includeMetadata: true,
      includeValues: false,
      filter
    })

    return results.matches.map(match => ({
      text: String(match.metadata?.text || ''),
      score: match.score || 0,
      metadata: {
        url: String(match.metadata?.url || ''),
        title: String(match.metadata?.title || ''),
        text: String(match.metadata?.text || ''),
        content: String(match.metadata?.content || ''),
        contentType: String(match.metadata?.contentType || ''),
        templateId: String(match.metadata?.templateId || '')
      }
    }))
  }

  // Getter für den Pinecone-Index
  getPineconeIndex() {
    return this.pinecone.index(this.indexName)
  }

  public async getAllDocuments(templateId: string, limit: number = 50): Promise<SearchResult[]> {
    try {
      const index = this.pinecone.index(this.indexName)
      
      // Erstelle einen Dummy-Vektor für die Suche
      const dummyVector = Array(1536).fill(0)
      
      const results = await index.query({
        vector: dummyVector,
        topK: limit,
        includeMetadata: true,
        filter: {
          templateId: { $eq: templateId }
        }
      })

      return results.matches.map(match => ({
        text: String(match.metadata?.text || ''),
        score: match.score || 0,
        metadata: this.validateMetadata(match.metadata)
      }))
    } catch (error) {
      console.error('Fehler beim Abrufen der Dokumente:', error)
      throw new Error(`Dokumentenabruf fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    }
  }

  public async updateContentType(contentId: string, newType: string): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName)
      
      // Hole den existierenden Vektor
      const existingVector = await index.fetch([contentId])
      
      if (!existingVector.records[contentId]) {
        throw new Error('Dokument nicht gefunden')
      }

      // Aktualisiere die Metadaten
      const metadata = {
        ...existingVector.records[contentId].metadata,
        contentType: newType
      }

      // Aktualisiere den Vektor mit den neuen Metadaten
      await index.update({
        id: contentId,
        metadata
      })

      console.log('Content-Type erfolgreich aktualisiert')
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Content-Types:', error)
      throw new Error(`Aktualisierung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    }
  }

  public async vectorizeContent(content: string, metadata: Record<string, any> = {}) {
    try {
      console.log('Erstelle Embedding für Content...')
      const embedding = await this.createEmbedding(content)

      console.log('Speichere in Pinecone...')
      const index = this.getPineconeIndex()

      await index.upsert([{
        id: `${this.templateId}-${Date.now()}`,
        values: embedding,
        metadata: {
          ...metadata,
          templateId: this.templateId,
          content
        }
      }])

      return true
    } catch (error) {
      console.error('Fehler beim Vektorisieren:', error)
      throw error
    }
  }

  public async createEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text
    })
    return response.data[0].embedding
  }

  public async deleteAllVectors() {
    try {
      console.log('Lösche alle Vektoren für Template:', this.templateId)
      const index = this.getPineconeIndex()
      
      await index.deleteMany({
        filter: {
          templateId: { $eq: this.templateId }
        }
      })
      
      return true
    } catch (error) {
      console.error('Fehler beim Löschen der Vektoren:', error)
      throw error
    }
  }

  public async updateDocument(
    documentId: string,
    newContent: string,
    metadata: DocumentMetadata
  ): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName)
      
      // Prüfe ob sich der Inhalt geändert hat
      const existingVectors = await index.fetch([documentId])
      const existingContent = existingVectors.records[documentId]?.metadata?.content
      
      if (existingContent === newContent) {
        // Nur Metadata aktualisieren wenn sich der Inhalt nicht geändert hat
        await index.update({
          id: documentId,
          metadata: {
            ...metadata,
            templateId: this.templateId
          }
        })
        return
      }

      // Verarbeite den neuen Content
      const chunks = await this.processMarkdownContent(newContent, metadata)
      
      // Batch-Update für alle Chunks
      const vectors = chunks.map((chunk, index) => ({
        id: `${documentId}_${index}`,
        values: chunk.embedding,
        metadata: {
          templateId: this.templateId,
          content: chunk.content,
          type: chunk.type,
          section: chunk.metadata.section || '',
          parentDocument: documentId,
          confidence: chunk.confidence,
          url: metadata.url,
          title: metadata.title,
          text: metadata.text,
          contentType: metadata.contentType
        }
      }))

      // Lösche alte Chunks
      const oldChunkIds = await this.findChunkIds(documentId)
      if (oldChunkIds.length > 0) {
        await index.deleteMany(oldChunkIds)
      }

      // Update in Batches
      await this.updateVectors(vectors)

    } catch (error) {
      console.error('Fehler beim Update:', error)
      throw error
    }
  }

  private async findChunkIds(documentId: string): Promise<string[]> {
    try {
      const index = this.pinecone.index(this.indexName)
      const dummyVector = new Array(1536).fill(0)
      
      const queryResponse = await index.query({
        vector: dummyVector,
        topK: 10000,
        filter: {
          parentDocument: { $eq: documentId }
        },
        includeMetadata: false
      })

      return queryResponse.matches?.map(match => match.id) || []
    } catch (error) {
      console.error('Fehler beim Suchen der Chunk-IDs:', error)
      return []
    }
  }

  private async updateVectors(vectors: Array<{
    id: string
    values: number[]
    metadata: Record<string, string | number | boolean | null>
  }>) {
    const index = this.pinecone.index(this.indexName)
    
    // Konvertiere alle Metadaten-Werte in gültige Pinecone-Werte
    const processedVectors = vectors.map(vector => ({
      id: vector.id,
      values: vector.values,
      metadata: Object.fromEntries(
        Object.entries(vector.metadata)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)])
      )
    }))

    await index.upsert(processedVectors)
  }

  private async processMarkdownContent(
    content: string,
    metadata: DocumentMetadata
  ): Promise<ProcessedChunk[]> {
    if (!content?.trim()) {
      console.warn('Leerer Content übergeben, überspringe Verarbeitung')
      return []
    }

    console.log('Verarbeite Markdown Content, Länge:', content.length)
    
    try {
      // Teile den Content in Sektionen
      const sections = this.splitIntoSections(content)
      console.log('Gefundene Sektionen:', sections.length)

      if (sections.length === 0) {
        console.warn('Keine Sektionen gefunden, überspringe Verarbeitung')
        return []
      }

      const chunks: ProcessedChunk[] = []
      
      for (const [index, section] of sections.entries()) {
        if (!section.content?.trim()) {
          console.warn('Leere Sektion übersprungen:', section.title)
          continue
        }

        console.log('Analysiere Sektion:', section.title)
        
        try {
          const analysis = await this.analyzeSection(section.content)
          console.log('Analyse abgeschlossen:', analysis.type)
          
          const embedding = await this.getEmbedding(section.content)
          console.log('Embedding generiert, Länge:', embedding.length)

          // Erweiterte Metadaten für die Sektion
          const sectionMetadata = {
            title: section.title,
            parentDocument: metadata.url,
            sectionLevel: section.level,
            sectionIndex: index,
            totalSections: sections.length,
            isMainSection: section.level === 1,
            hasImages: (metadata.images?.length ?? 0) > 0,
            regions: metadata.regions || [],
            ...analysis.metadata
          }

          chunks.push({
            id: `${metadata.url}-${section.title}-${index}`,
            type: analysis.type,
            content: section.content,
            metadata: sectionMetadata,
            confidence: analysis.confidence,
            embedding
          })

          // Wenn die Sektion sehr lang ist, teile sie in kleinere Chunks
          if (section.content.length > 1500) {
            const subChunks = this.splitLongSection(section.content)
            for (const [subIndex, subChunk] of subChunks.entries()) {
              if (!subChunk?.trim()) continue

              const subEmbedding = await this.getEmbedding(subChunk)
              chunks.push({
                id: `${metadata.url}-${section.title}-${index}-${subIndex}`,
                type: analysis.type,
                content: subChunk,
                metadata: {
                  ...sectionMetadata,
                  isSubChunk: true,
                  subChunkIndex: subIndex,
                  totalSubChunks: subChunks.length
                },
                confidence: analysis.confidence,
                embedding: subEmbedding
              })
            }
          }
        } catch (error) {
          console.error('Fehler bei der Verarbeitung der Sektion:', section.title, error)
        }
      }

      return chunks
    } catch (error) {
      console.error('Fehler bei der Markdown-Verarbeitung:', error)
      return []
    }
  }
} 