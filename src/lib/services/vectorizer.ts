import { Pinecone, Index, IndexList, CreateIndexOptions } from '@pinecone-database/pinecone'
import OpenAI from 'openai'
import { v4 as uuidv4 } from 'uuid'
import { RecordMetadata } from '@/lib/types/record'
import { nanoid } from 'nanoid'

// Definiere ContentType direkt hier
export type ContentType = 
  | 'medical'    // Medizinische Leistungen
  | 'insurance'  // Versicherungsleistungen
  | 'service'    // Allgemeine Services
  | 'legal'      // Rechtliche Themen
  | 'financial'  // Finanzen
  | 'education'  // Bildung
  | 'support';   // Kundenservice

interface VectorizerConfig {
  openaiApiKey: string;
  pineconeApiKey: string;
  pineconeEnvironment: string;
  pineconeIndex: string;
  templateId: string;
}

interface VectorizeInput {
  content: string;
  metadata: Record<string, any>;
}

interface VectorResult {
  vectors: Array<{
    id: string;
    values: number[];
    metadata: Record<string, any>;
  }>;
  metadata?: {
    count: number;
    timestamp: string;
    templateId: string;
  };
}

interface DocumentMetadata {
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
    coverage?: string[]
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

interface PineconeIndexConfig extends CreateIndexOptions {
  metadataConfig?: {
    indexed: string[]
  }
}

export class ContentVectorizer {
  private openai: OpenAI;
  private pinecone: Pinecone;
  private config: VectorizerConfig;
  private indexName: string;
  private index?: Index;

  constructor(config: VectorizerConfig) {
    this.config = config;
    
    // Initialisiere OpenAI
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey
    });
    
    // Initialisiere Pinecone
    this.pinecone = new Pinecone({
      apiKey: config.pineconeApiKey
    });

    // Generiere template-spezifischen Index-Namen
    this.indexName = `template-${config.templateId}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }

  public async vectorize(input: VectorizeInput): Promise<VectorResult> {
    try {
      // Stelle sicher, dass der Index existiert
      await this.ensureIndexExists();
      
      console.log(`
Starte Vektorisierung:
- Template ID: ${this.config.templateId}
- Index Name: ${this.indexName}
- Environment: ${this.config.pineconeEnvironment}
`);
      
      // Analysiere den Content zuerst
      const analysis = await this.analyzeSection(input.content);
      console.log('Content-Analyse abgeschlossen:', {
        type: analysis.type,
        confidence: analysis.confidence,
        metadata: analysis.metadata
      });

      // Generiere Embedding mit OpenAI
      const embeddingResponse = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: input.content
      });

      const embedding = embeddingResponse.data[0].embedding;
      console.log('Embedding erstellt:', embedding.length, 'Dimensionen');

      // Erstelle eindeutige ID
      const id = `vec_${this.config.templateId}_${Date.now()}`;
      
      // Bereite Vector für Pinecone vor
      const vector = {
        id,
        values: embedding,
        metadata: {
          ...input.metadata,
          type: analysis.type,
          confidence: analysis.confidence,
          timestamp: new Date().toISOString(),
          templateId: this.config.templateId,
          // Flache Struktur für bessere Suchbarkeit
          images: JSON.stringify(analysis.metadata.media?.images || []),
          videos: JSON.stringify(analysis.metadata.media?.videos || []),
          files: JSON.stringify(analysis.metadata.media?.files || []),
          links: JSON.stringify(analysis.metadata.media?.links || []),
          forms: JSON.stringify(analysis.metadata.interactive?.forms || []),
          buttons: JSON.stringify(analysis.metadata.interactive?.buttons || []),
          calculators: JSON.stringify(analysis.metadata.interactive?.calculators || []),
          requirements: JSON.stringify(analysis.metadata.requirements || []),
          coverage: JSON.stringify(analysis.metadata.coverage || []),
          nextSteps: JSON.stringify(analysis.metadata.nextSteps || []),
          contactPoints: JSON.stringify(analysis.metadata.contactPoints || []),
          relatedTopics: JSON.stringify(analysis.metadata.relatedTopics || []),
          deadlines: JSON.stringify(analysis.metadata.deadlines || []),
          domain: analysis.metadata.domain,
          subDomain: analysis.metadata.subDomain,
          provider: analysis.metadata.provider,
          serviceType: analysis.metadata.serviceType
        }
      };

      // Hole Index-Instanz
      const index = this.pinecone.index(this.indexName);
      
      // Versuche Upsert
      console.log('Versuche Vector-Upsert mit Metadaten:', JSON.stringify(vector.metadata, null, 2));
      await index.upsert([vector]);
      
      // Warte kurz vor der Verifizierung
      console.log('Verifiziere Speicherung...');
      let retries = 0;
      const maxRetries = 5;  // Erhöhe die Anzahl der Versuche
      
      while (retries < maxRetries) {
        try {
          // Warte länger zwischen den Versuchen
          await new Promise(resolve => setTimeout(resolve, 2000 * (retries + 1)));
          
          const verification = await index.fetch([id]);
          
          if (verification.records && verification.records[id]) {
            console.log(`Vector erfolgreich gespeichert und verifiziert:
- Status: Erfolgreich
- Index: ${this.indexName}
- Vector ID: ${id}
- Metadaten: ${JSON.stringify(vector.metadata, null, 2)}
`);
            
            return {
              vectors: [vector],
              metadata: {
                count: 1,
                timestamp: new Date().toISOString(),
                templateId: this.config.templateId
              }
            };
          }
          
          console.log(`Verifizierung fehlgeschlagen, Versuch ${retries + 1}/${maxRetries}`);
          retries++;
        } catch (error) {
          console.error(`Fehler bei Verifizierungsversuch ${retries + 1}:`, error);
          retries++;
          continue;
        }
      }
      
      throw new Error(`Vektor konnte nach ${maxRetries} Versuchen nicht verifiziert werden. Bitte prüfen Sie die Pinecone-Konfiguration und Verbindung.`);

    } catch (error) {
      console.error('Fehler bei der Vektorisierung:', error);
      throw error;
    }
  }

  private async validateIndex(): Promise<void> {
    try {
      const index = this.pinecone.index(this.config.pineconeIndex)
      const stats = await index.describeIndexStats()
      console.log('Index-Validierung erfolgreich:', {
        indexName: this.config.pineconeIndex,
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
      const index = this.pinecone.index(this.config.pineconeIndex)
      
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
          templateId: this.config.templateId,
          lastUpdated: new Date().toISOString()
        }
      }))

      console.log('Sende Upsert-Request an Pinecone:', {
        indexName: this.config.pineconeIndex,
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

  private validateMetadata(metadata: Record<string, any> | undefined): DocumentMetadata {
    if (!metadata) {
      return {
        id: uuidv4(),
        type: 'document',
        title: 'Untitled Document',
        text: '',
        content: '',
        contentType: 'unknown',
        url: '',
        templateId: this.config.templateId,
        language: 'de',
        lastModified: new Date().toISOString()
      }
    }

    return {
      id: metadata.id || uuidv4(),
      type: metadata.type || 'document',
      title: metadata.title || 'Untitled Document',
      text: metadata.text || '',
      content: metadata.content || '',
      contentType: metadata.contentType || 'unknown',
      url: metadata.url || '',
      templateId: metadata.templateId || this.config.templateId,
      language: metadata.language || 'de',
      lastModified: metadata.lastModified || new Date().toISOString(),
      ...metadata
    }
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
      domain: string
      subDomain: string
      provider: string
      serviceType: string
      requirements?: string[]
      coverage?: string[]
      nextSteps?: string[]
      relatedTopics?: string[]
      deadlines?: string[]
      contactPoints?: Array<{
        type: string
        value: string
        description?: string
      }>
      media?: {
        images: Array<{
          url: string
          alt?: string
          caption?: string
        }>
        videos: Array<{
          url: string
          type: string
          title?: string
        }>
        files: Array<{
          url: string
          type: string
          name: string
          size?: string
        }>
        links: Array<{
          url: string
          title: string
          type: 'internal' | 'external'
          description?: string
        }>
      }
      interactive?: {
        forms?: Array<{
          id: string
          action: string
          fields: Array<{
            name: string
            type: string
            required: boolean
          }>
        }>
        buttons?: Array<{
          text: string
          action: string
          type: string
        }>
        calculators?: Array<{
          type: string
          inputs: string[]
          outputs: string[]
        }>
      }
    }
  }> {
    const prompt = `Analysiere den folgenden Content und extrahiere alle relevanten Informationen.
    Berücksichtige dabei:
    - Um welche Art von Leistung oder Service handelt es sich?
    - In welchen Geschäftsbereich fällt der Inhalt?
    - Welche interaktiven Elemente sind vorhanden (Links, Formulare, Buttons)?
    - Welche Medien sind eingebettet (Bilder, Videos, Downloads)?
    - Welche wichtigen Informationen werden vermittelt?

    Content:
    ${content}

    Antworte im JSON-Format mit:
    {
      "type": "einer der folgenden Typen: medical, insurance, service, legal, financial, education, support",
      "confidence": "Konfidenz zwischen 0 und 1",
      "metadata": {
        "domain": "Hauptgeschäftsbereich",
        "subDomain": "Spezifischer Bereich",
        "provider": "Anbieter der Leistung",
        "serviceType": "Art der Leistung",
        "requirements": ["voraussetzungen", "bedingungen"],
        "coverage": ["leistungsumfang", "details"],
        "nextSteps": ["nächste Schritte"],
        "relatedTopics": ["verwandte Themen"],
        "deadlines": ["relevante Fristen"],
        "contactPoints": [
          {
            "type": "Kontaktart",
            "value": "Kontaktdetails",
            "description": "Beschreibung"
          }
        ],
        "media": {
          "images": [
            {
              "url": "Bild-URL",
              "alt": "Alternativtext",
              "caption": "Bildunterschrift"
            }
          ],
          "videos": [
            {
              "url": "Video-URL",
              "type": "Video-Typ (z.B. YouTube, Vimeo)",
              "title": "Video-Titel"
            }
          ],
          "files": [
            {
              "url": "Datei-URL",
              "type": "Dateityp (z.B. PDF, DOC)",
              "name": "Dateiname",
              "size": "Dateigröße"
            }
          ],
          "links": [
            {
              "url": "Link-URL",
              "title": "Link-Titel",
              "type": "internal oder external",
              "description": "Link-Beschreibung"
            }
          ]
        },
        "interactive": {
          "forms": [
            {
              "id": "Formular-ID",
              "action": "Formular-Aktion",
              "fields": [
                {
                  "name": "Feldname",
                  "type": "Feldtyp",
                  "required": true/false
                }
              ]
            }
          ],
          "buttons": [
            {
              "text": "Button-Text",
              "action": "Button-Aktion",
              "type": "Button-Typ"
            }
          ],
          "calculators": [
            {
              "type": "Rechner-Typ",
              "inputs": ["Eingabefelder"],
              "outputs": ["Ausgabefelder"]
            }
          ]
        }
      }
    }`

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('Keine Antwort vom Modell erhalten');
    }

    return JSON.parse(response);
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
        templateId: this.config.templateId,
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
      const batchSize = 40
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
    const index = this.pinecone.index(this.config.pineconeIndex)

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
    return this.pinecone.index(this.config.pineconeIndex)
  }

  public async getAllDocuments(templateId: string, limit: number = 50): Promise<SearchResult[]> {
    try {
      const index = this.pinecone.index(this.config.pineconeIndex)
      
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
      const index = this.pinecone.index(this.config.pineconeIndex)
      
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

      // Extrahiere Link-Informationen aus den Metadaten
      const links = metadata.links || {}
      
      await index.upsert([{
        id: `${this.config.templateId}-${Date.now()}`,
        values: embedding,
        metadata: {
          ...metadata,
          templateId: this.config.templateId,
          content,
          // Speichere Links als JSON-Strings
          links_internal: JSON.stringify(links.internal?.map((link: { url: string; title: string }) => ({
            url: link.url,
            title: link.title
          })) || []),
          links_external: JSON.stringify(links.external?.map((link: { url: string; domain: string; trust: number }) => ({
            url: link.url,
            domain: link.domain,
            trust: link.trust
          })) || []),
          links_media: JSON.stringify(links.media?.map((media: { url: string; type: string; description: string }) => ({
            url: media.url,
            type: media.type,
            description: media.description
          })) || [])
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
      console.log('Lösche alle Vektoren für Template:', this.config.templateId)
      const index = this.getPineconeIndex()
      
      await index.deleteMany({
        filter: {
          templateId: { $eq: this.config.templateId }
        }
      })
      
      return true
    } catch (error) {
      console.error('Fehler beim Löschen der Vektoren:', error)
      throw error
    }
  }

  /**
   * Effizientes Update von Dokumenten basierend auf der Template-ID
   */
  public async efficientUpdate(
    documentId: string,
    newContent: string,
    metadata: DocumentMetadata,
    compareHash?: string
  ): Promise<void> {
    try {
      const index = this.pinecone.index(this.config.pineconeIndex)
      
      // Hole existierenden Vektor
      const existingVectors = await index.fetch([documentId])
      const existingVector = existingVectors.records[documentId]
      
      if (!existingVector) {
        // Dokument existiert nicht - erstelle neu
        await this.vectorizeContent(newContent, {
          ...metadata,
          templateId: this.config.templateId
        })
        return
      }

      // Prüfe Hash wenn vorhanden
      if (compareHash && existingVector.metadata?.contentHash === compareHash) {
        // Content unverändert - update nur Metadata
        await index.update({
          id: documentId,
          metadata: {
            ...metadata,
            templateId: this.config.templateId,
            lastUpdated: new Date().toISOString()
          }
        })
        return
      }

      // Content hat sich geändert - Update mit neuem Content
      await this.updateDocument(documentId, newContent, metadata)
    } catch (error) {
      console.error('Fehler beim effizienten Update:', error)
      throw error
    }
  }

  public async updateDocument(
    documentId: string,
    newContent: string,
    metadata: DocumentMetadata
  ): Promise<void> {
    try {
      const index = this.pinecone.index(this.config.pineconeIndex)
      
      // Generiere Hash für Content-Vergleich
      const contentHash = await this.generateContentHash(newContent)
      
      // Prüfe ob sich der Inhalt geändert hat
      const existingVectors = await index.fetch([documentId])
      const existingVector = existingVectors.records[documentId]
      
      if (existingVector?.metadata?.contentHash === contentHash) {
        // Nur Metadata aktualisieren wenn sich der Inhalt nicht geändert hat
        await index.update({
          id: documentId,
          metadata: {
            ...metadata,
            templateId: this.config.templateId,
            contentHash,
            lastUpdated: new Date().toISOString()
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
          templateId: this.config.templateId,
          content: chunk.content,
          type: chunk.type,
          section: chunk.metadata.section || '',
          parentDocument: documentId,
          confidence: chunk.confidence,
          url: metadata.url,
          title: metadata.title,
          text: metadata.text,
          contentType: metadata.contentType,
          contentHash,
          lastUpdated: new Date().toISOString()
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

  private async generateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private async findChunkIds(documentId: string): Promise<string[]> {
    try {
      const index = this.pinecone.index(this.config.pineconeIndex)
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
    const index = this.pinecone.index(this.config.pineconeIndex)
    
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

  private async ensureIndexExists(): Promise<void> {
    try {
      const indexList = await this.pinecone.listIndexes()
      const indexNames = Array.isArray(indexList) 
        ? indexList.map((idx: { name: string }) => idx.name)
        : Object.values(indexList).map((idx: { name: string }) => idx.name)
      
      const indexExists = indexNames.includes(this.indexName)

      if (!indexExists) {
        console.log(`Erstelle neuen Index "${this.indexName}"...`)
        
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: 1536, // OpenAI embedding dimension
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-west-2'
            }
          }
        })

        // Warte kurz, damit der Index initialisiert werden kann
        await new Promise(resolve => setTimeout(resolve, 10000))
      }

      this.index = this.pinecone.Index(this.indexName)
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        console.log(`Index "${this.indexName}" existiert bereits durch parallele Erstellung`)
        this.index = this.pinecone.Index(this.indexName)
        return
      }
      throw error
    }
  }
} 