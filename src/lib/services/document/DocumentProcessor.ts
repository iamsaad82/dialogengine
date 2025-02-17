import { ContentType, ContentTypeEnum } from '../../types/contentTypes'
import { StructuralElement, XmlElement } from '../../types/structural'
import { 
  DocumentMetadata, 
  ProcessedDocument,
  ExtendedDetectionResult,
  RelatedTopics,
  InteractiveElement
} from './types'
import { OpenAI } from 'openai'
import { ContentTypeDetector, DetectionInput, DetectionResult } from '../contentTypeDetector'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import { HandlerGenerator } from './HandlerGenerator'
import { HandlerConfig } from '../../types/template'
import { MonitoringService } from '../../monitoring/monitoring'
import { HandlerFeedback } from './HandlerFeedback'
import { DOMParser } from '@xmldom/xmldom'
import { select } from 'xpath'
import { LinkExtractor } from './LinkExtractor'
import { Worker } from 'worker_threads'
import { createHash } from 'crypto'

export class DocumentProcessor {
  private openai: OpenAI
  private detector: ContentTypeDetector
  private handlerGenerator: HandlerGenerator
  private monitoring: MonitoringService
  private handlerFeedback: HandlerFeedback
  private linkExtractor: LinkExtractor
  private parserCache: Map<string, DOMParser>
  private chunkCache: Map<string, string[]>
  private metadataCache: Map<string, DocumentMetadata>

  constructor(
    openaiApiKey: string,
    monitoring: MonitoringService,
    handlerFeedback?: HandlerFeedback
  ) {
    this.openai = new OpenAI({ apiKey: openaiApiKey })
    this.detector = new ContentTypeDetector(this.openai)
    this.handlerGenerator = new HandlerGenerator(openaiApiKey)
    this.monitoring = monitoring
    this.handlerFeedback = handlerFeedback || new HandlerFeedback(monitoring)
    this.linkExtractor = new LinkExtractor(monitoring)
    this.parserCache = new Map()
    this.chunkCache = new Map()
    this.metadataCache = new Map()
  }

  private getCacheKey(content: string): string {
    return createHash('md5').update(content).digest('hex')
  }

  private getParser(type: string): DOMParser {
    if (!this.parserCache.has(type)) {
      this.parserCache.set(type, new DOMParser({
        locator: false,
        errorHandler: {
          warning: (msg) => console.warn(`[XML-Parser] Warnung: ${msg}`),
          error: (msg) => console.error(`[XML-Parser] Fehler: ${msg}`),
          fatalError: (msg) => console.error(`[XML-Parser] Kritischer Fehler: ${msg}`)
        }
      }))
    }
    return this.parserCache.get(type)!
  }

  private async processChunksInParallel(chunks: string[]): Promise<string[]> {
    const workers = chunks.map(chunk => {
      return new Promise<string>((resolve, reject) => {
        const worker = new Worker(`
          const { parentPort } = require('worker_threads');
          parentPort.on('message', (chunk) => {
            try {
              // Verarbeite den Chunk
              const processed = chunk.trim()
                .replace(/\\s+/g, ' ')
                .replace(/[\\x00-\\x1F\\x7F-\\x9F]/g, '');
              parentPort.postMessage(processed);
            } catch (error) {
              parentPort.postMessage({ error: error.message });
            }
          });
        `, { eval: true });

        worker.on('message', (result) => {
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result);
          }
        });

        worker.on('error', reject);
        worker.postMessage(chunk);
      });
    });

    return Promise.all(workers);
  }

  private async extractMetadataParallel(content: string): Promise<DocumentMetadata> {
    const cacheKey = this.getCacheKey(content);
    
    if (this.metadataCache.has(cacheKey)) {
      return this.metadataCache.get(cacheKey)!;
    }

    const [
      typeInfo,
      structuredData,
      interactiveElements,
      extractedLinks,
      language
    ] = await Promise.all([
      this.detectContentType(content),
      this.extractStructuredData(content),
      this.extractInteractiveElements(content),
      this.linkExtractor.extract(content),
      this.detectLanguage(content)
    ]);

    const metadata: DocumentMetadata = {
      id: `${typeInfo.type}:${Date.now()}`,
      type: typeInfo.type,
      title: this.extractTitle(content) || 'Untitled',
      language,
      source: 'document',
      lastModified: new Date().toISOString(),
      templateId: typeInfo.type,
      templateMetadata: {
        ...typeInfo.suggestedMetadata,
        ...structuredData.metadata
      },
      actions: [
        ...interactiveElements.map(element => ({
          type: element.type,
          label: element.text,
          url: element.action,
          priority: element.priority || 1
        })),
        ...extractedLinks.internal.map(link => ({
          type: 'link' as const,
          label: link.title,
          url: link.url,
          priority: 1
        })),
        ...extractedLinks.external.map(link => ({
          type: 'link' as const,
          label: link.domain,
          url: link.url,
          priority: link.trust
        })),
        ...extractedLinks.media.map(media => ({
          type: 'download' as const,
          label: media.description,
          url: media.url,
          priority: 1
        }))
      ],
      hasImages: extractedLinks.media.some(media => media.type === 'image'),
      contactPoints: await this.extractContactPoints(content),
      relatedTopics: await this.extractRelatedTopics(content)
    };

    this.metadataCache.set(cacheKey, metadata);
    return metadata;
  }

  async processDocument(file: File, templateId: string): Promise<{
    document: ProcessedDocument
    handler: HandlerConfig
  }> {
    try {
      console.log('[DocumentProcessor] Starte Verarbeitung für Datei:', file.name, ', Template:', templateId)
      
      // Extrahiere Content
      const startTime = Date.now()
      let content = await this.extractContent(file)
      console.log(`[DocumentProcessor] Inhalt extrahiert (${(Date.now() - startTime) / 1000}s), Länge: ${content.length} Zeichen`)
      
      // Bereinige Content
      content = this.cleanContent(content)
      
      // Erkenne Content-Type
      console.log(`[DocumentProcessor] Starte Content-Type Erkennung`)
      const typeDetectionStart = Date.now()
      this.monitoring.recordDocumentProcessing(templateId, 'type_detection', true)
      const typeInfo = await this.detectContentType(content)
      const typeDetectionTime = (Date.now() - typeDetectionStart) / 1000
      this.monitoring.recordDocumentProcessingLatency(templateId, 'type_detection', typeDetectionTime)
      console.log(`[DocumentProcessor] Content-Type erkannt (${typeDetectionTime}s): ${typeInfo.type}`)
      
      // Extrahiere strukturierte Daten
      console.log(`[DocumentProcessor] Starte Extraktion strukturierter Daten`)
      const structuredDataStart = Date.now()
      this.monitoring.recordDocumentProcessing(templateId, 'structured_data_extraction', true)
      const structuredData = await this.extractStructuredData(content)
      const structuredDataTime = (Date.now() - structuredDataStart) / 1000
      this.monitoring.recordDocumentProcessingLatency(templateId, 'structured_data_extraction', structuredDataTime)
      console.log(`[DocumentProcessor] Strukturierte Daten extrahiert (${structuredDataTime}s)`)
      
      // Extrahiere interaktive Elemente
      console.log(`[DocumentProcessor] Extrahiere interaktive Elemente`)
      const interactiveStart = Date.now()
      this.monitoring.recordDocumentProcessing(templateId, 'interactive_extraction', true)
      const interactiveElements = await this.extractInteractiveElements(content)
      const extractedLinks = await this.linkExtractor.extract(content)
      const interactiveTime = (Date.now() - interactiveStart) / 1000
      this.monitoring.recordDocumentProcessingLatency(templateId, 'interactive_extraction', interactiveTime)
      console.log(`[DocumentProcessor] Interaktive Elemente extrahiert (${interactiveTime}s)`)
      
      // Erstelle Basis-Metadata
      console.log(`[DocumentProcessor] Erstelle Metadaten`)
      const metadata: DocumentMetadata = {
        id: `${templateId}:${file.name}`,
        type: typeInfo.type,
        title: this.extractTitle(content) || file.name,
        language: await this.detectLanguage(content),
        source: file.name,
        lastModified: new Date(file.lastModified).toISOString(),
        templateId,
        templateMetadata: {
          ...typeInfo.suggestedMetadata,
          ...structuredData.metadata
        },
        actions: [
          ...interactiveElements.map(element => ({
            type: element.type,
            label: element.text,
            url: element.action,
            priority: element.priority || 1
          })),
          ...extractedLinks.internal.map(link => ({
            type: 'link' as const,
            label: link.title,
            url: link.url,
            priority: 1
          })),
          ...extractedLinks.external.map(link => ({
            type: 'link' as const,
            label: link.domain,
            url: link.url,
            priority: link.trust
          })),
          ...extractedLinks.media.map(media => ({
            type: 'download' as const,
            label: media.description,
            url: media.url,
            priority: 1
          }))
        ],
        hasImages: extractedLinks.media.some(media => media.type === 'image'),
        contactPoints: await this.extractContactPoints(content),
        relatedTopics: await this.extractRelatedTopics(content)
      }
      console.log(`[DocumentProcessor] Metadaten erstellt: ${JSON.stringify(metadata, null, 2)}`)

      const processedDocument: ProcessedDocument = {
        content,
        metadata,
        structuredData
      }

      // Generiere Handler
      console.log(`[DocumentProcessor] Starte Handler-Generierung`)
      const handlerStart = Date.now()
      this.monitoring.recordDocumentProcessing(templateId, 'handler_generation', true)
      let handler = await this.handlerGenerator.generateHandler(processedDocument)
      const handlerGenerationTime = (Date.now() - handlerStart) / 1000
      this.monitoring.recordDocumentProcessingLatency(templateId, 'handler_generation', handlerGenerationTime)
      console.log(`[DocumentProcessor] Handler generiert (${handlerGenerationTime}s): ${JSON.stringify(handler, null, 2)}`)

      // Optimiere Handler basierend auf vorhandenem Feedback
      console.log(`[DocumentProcessor] Optimiere Handler`)
      handler = await this.handlerFeedback.optimizeHandler(handler.type, handler)
      console.log(`[DocumentProcessor] Handler optimiert`)

      // Erfolgreich abgeschlossen
      const totalTime = (Date.now() - startTime) / 1000
      this.monitoring.recordIndexingSuccess(templateId)
      console.log(`[DocumentProcessor] Verarbeitung abgeschlossen (${totalTime}s)`)
      
      return {
        document: processedDocument,
        handler
      }
    } catch (error) {
      console.error(`[DocumentProcessor] Fehler bei der Verarbeitung:`, error)
      this.monitoring.recordProcessingError(
        templateId,
        'document_processing',
        error instanceof Error ? error.name : 'UnknownError'
      )
      throw error
    }
  }

  private async extractContent(file: File): Promise<string> {
    // Prüfe die Dateigröße
    const MAX_CHUNK_SIZE = 900000; // ~900KB pro Chunk für OpenAI
    
    if (file.size > MAX_CHUNK_SIZE) {
        console.warn(`[DocumentProcessor] Große Datei erkannt (${(file.size / 1024 / 1024).toFixed(2)}MB). Verwende Chunking.`);
        return this.processLargeFile(file, MAX_CHUNK_SIZE);
    }

    const text = await file.text();
    
    // Prüfe, ob es sich um eine XML-Datei handelt
    if (file.type === 'application/xml' || file.type === 'text/xml' || file.name.endsWith('.xml')) {
        return this.processXmlContent(text);
    }
    
    return this.cleanContent(text);
  }

  private async processLargeFile(file: File, maxChunkSize: number): Promise<string> {
    const cacheKey = this.getCacheKey(await file.text());
    
    if (this.chunkCache.has(cacheKey)) {
      return this.chunkCache.get(cacheKey)!.join('\n\n');
    }

    let chunks: string[] = [];
    const fileType = this.determineFileType(file);

    switch (fileType) {
      case 'xml':
        chunks = await this.processLargeXmlContent(await file.text(), maxChunkSize);
        break;
      case 'markdown':
        chunks = await this.processLargeMarkdownContent(await file.text(), maxChunkSize);
        break;
      default:
        chunks = await this.processLargeTextContent(await file.text(), maxChunkSize);
    }

    // Verarbeite Chunks parallel
    const processedChunks = await this.processChunksInParallel(chunks);
    this.chunkCache.set(cacheKey, processedChunks);
    
    return processedChunks.join('\n\n');
  }

  private determineFileType(file: File): 'xml' | 'markdown' | 'text' {
    if (file.type === 'application/xml' || file.type === 'text/xml' || file.name.endsWith('.xml')) {
      return 'xml';
    }
    if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
      return 'markdown';
    }
    return 'text';
  }

  private async processLargeMarkdownContent(content: string, maxChunkSize: number): Promise<string[]> {
    const tree = await unified()
      .use(remarkParse)
      .use(remarkFrontmatter)
      .parse(content);

    const chunks: string[] = [];
    let currentChunk = '';
    let currentSize = 0;

    // Traversiere den AST und erstelle semantisch sinnvolle Chunks
    const visit = (node: any) => {
      if (node.type === 'heading' || node.type === 'paragraph') {
        const text = this.extractNodeText(node);
        if (currentSize + text.length > maxChunkSize) {
          if (currentChunk) {
            chunks.push(currentChunk);
          }
          currentChunk = text;
          currentSize = text.length;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + text;
          currentSize += text.length;
        }
      }

      if (node.children) {
        node.children.forEach(visit);
      }
    };

    visit(tree);

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  private extractNodeText(node: any): string {
    if (node.type === 'text') {
      return node.value;
    }
    if (node.children) {
      return node.children.map((child: any) => this.extractNodeText(child)).join('');
    }
    return '';
  }

  private async processLargeXmlContent(xmlContent: string, maxChunkSize: number): Promise<string[]> {
    console.log(`[DocumentProcessor] Verarbeite große XML-Datei (${(xmlContent.length / 1024 / 1024).toFixed(2)}MB)`)
    try {
        console.log('[DocumentProcessor] Initialisiere XML-Parser')
        const parser = new DOMParser({
            locator: false,
            errorHandler: {
                warning: (msg) => console.warn('[XML-Parser] Warnung:', msg),
                error: (msg) => console.error('[XML-Parser] Fehler:', msg),
                fatalError: (msg) => console.error('[XML-Parser] Kritischer Fehler:', msg)
            }
        })
        
        console.log('[DocumentProcessor] Parse XML-Dokument')
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml')
        
        console.log('[DocumentProcessor] Extrahiere Metadaten')
        const metadata = this.extractXmlMetadata(xmlDoc)
        console.log('[DocumentProcessor] Gefundene Metadaten:', metadata)
        
        console.log('[DocumentProcessor] Teile Dokument in Chunks')
        const chunks = this.splitXmlIntoChunks(xmlDoc, maxChunkSize)
        console.log(`[DocumentProcessor] Dokument in ${chunks.length} Chunks geteilt`)
        
        console.log('[DocumentProcessor] Verarbeite Chunks')
        const processedChunks = chunks.map((chunk, index) => {
            console.log(`[DocumentProcessor] Verarbeite Chunk ${index + 1}/${chunks.length}`)
            const textNodes = select('//text()', chunk)
            const attributeNodes = select('//@*', chunk)
            
            const textContent = textNodes
                .map(node => node.nodeValue?.trim())
                .filter(Boolean)
            
            const attributeContent = attributeNodes
                .map(node => `${node.nodeName}: ${node.nodeValue}`)
                .filter(Boolean)
            
            console.log(`[DocumentProcessor] Chunk ${index + 1}: ${textContent.length} Textknoten, ${attributeContent.length} Attribute`)
            return [...textContent, ...attributeContent].join('\n')
        })
        
        console.log('[DocumentProcessor] Kombiniere verarbeitete Chunks')
        const combinedContent = [
            metadata,
            ...processedChunks.map(chunk => this.cleanContent(chunk))
        ].join('\n\n')
        
        console.log(`[DocumentProcessor] Finale Größe: ${(combinedContent.length / 1024).toFixed(2)}KB`)
        return this.truncateContent(combinedContent, maxChunkSize)
    } catch (error) {
        console.error('[DocumentProcessor] Fehler bei der XML-Verarbeitung:', error)
        throw error
    }
  }

  private extractXmlMetadata(xmlDoc: Document): string {
    const metadata: string[] = [];
    
    // Root-Element Metadaten
    const root = xmlDoc.documentElement;
    if (root) {
        metadata.push(`Dokument-Typ: ${root.nodeName}`);
        
        // Root-Attribute
        for (let i = 0; i < root.attributes.length; i++) {
            const attr = root.attributes[i];
            metadata.push(`${attr.name}: ${attr.value}`);
        }
    }
    
    return metadata.join('\n');
  }

  private splitXmlIntoChunks(xmlDoc: Document, maxChunkSize: number): Document[] {
    const chunks: Document[] = [];
    const nodes = select('//node()', xmlDoc);
    let currentChunk: Node[] = [];
    let currentSize = 0;
    
    for (const node of nodes) {
        const nodeSize = node.toString().length;
        
        if (currentSize + nodeSize > maxChunkSize) {
            if (currentChunk.length > 0) {
                const chunkDoc = this.createChunkDocument(currentChunk);
                chunks.push(chunkDoc);
                currentChunk = [];
                currentSize = 0;
            }
        }
        
        currentChunk.push(node);
        currentSize += nodeSize;
    }
    
    // Letzten Chunk hinzufügen
    if (currentChunk.length > 0) {
        const chunkDoc = this.createChunkDocument(currentChunk);
        chunks.push(chunkDoc);
    }
    
    return chunks;
  }

  private createChunkDocument(nodes: Node[]): Document {
    const parser = new DOMParser();
    const doc = parser.parseFromString('<root></root>', 'text/xml');
    
    for (const node of nodes) {
        doc.documentElement.appendChild(node.cloneNode(true));
    }
    
    return doc;
  }

  private processLargeTextContent(content: string, maxChunkSize: number): string[] {
    // Teile den Text in Chunks
    const chunks = this.splitTextIntoChunks(content, maxChunkSize);
    
    // Extrahiere die wichtigsten Inhalte aus jedem Chunk
    const processedChunks = chunks.map(chunk => this.cleanContent(chunk));
    
    // Kombiniere die wichtigsten Inhalte
    const combinedContent = processedChunks.join('\n\n');
    
    // Stelle sicher, dass wir unter dem Limit bleiben
    return this.truncateContent(combinedContent, maxChunkSize);
  }

  private splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    let currentChunk = '';
    
    // Teile nach Absätzen
    const paragraphs = text.split(/\n\s*\n/);
    
    for (const paragraph of paragraphs) {
        if (currentChunk.length + paragraph.length > maxChunkSize) {
            if (currentChunk) {
                chunks.push(currentChunk);
                currentChunk = '';
            }
            // Wenn ein einzelner Paragraph zu groß ist, teile ihn nach Sätzen
            if (paragraph.length > maxChunkSize) {
                const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
                for (const sentence of sentences) {
                    if (sentence.length > maxChunkSize) {
                        // Teile sehr lange Sätze in kleinere Stücke
                        const subChunks = sentence.match(new RegExp(`.{1,${maxChunkSize}}`, 'g')) || [];
                        chunks.push(...subChunks);
                    } else {
                        chunks.push(sentence);
                    }
                }
            } else {
                currentChunk = paragraph;
            }
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk);
    }
    
    return chunks;
  }

  private truncateContent(content: string, maxSize: number): string[] {
    if (content.length <= maxSize) {
        return [content];
    }
    
    // Behalte wichtige Metadaten am Anfang
    const lines = content.split('\n');
    let result: string[] = [];
    let currentSize = 0;
    
    for (const line of lines) {
        if (currentSize + line.length + 1 > maxSize) {
            break;
        }
        result.push(line);
        currentSize += line.length + 1;
    }
    
    return result;
  }

  private processXmlContent(xmlContent: string): string {
    try {
      // Optimierte XML-Verarbeitung
      const parser = new DOMParser({
        locator: false,
        errorHandler: {
          warning: () => {},
          error: () => {},
          fatalError: () => {}
        }
      })
      
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml')
      
      // Extrahiere Text mit XPath für bessere Performance
      const textNodes = select('//text()', xmlDoc)
      const attributeNodes = select('//@*', xmlDoc)
      
      let text = textNodes
        .map(node => node.nodeValue?.trim())
        .filter(Boolean)
        .join('\n')
      
      const attributes = attributeNodes
        .map(node => `${node.nodeName}: ${node.nodeValue}`)
        .join('\n')
      
      return this.cleanContent(`${text}\n${attributes}`)
    } catch (error) {
      console.error('Fehler bei der XML-Verarbeitung:', error)
      // Fallback: Behandle als normalen Text
      return this.cleanContent(xmlContent)
    }
  }

  private async detectContentType(content: string): Promise<ExtendedDetectionResult> {
    try {
      const result = await this.detector.detect(content)
      return {
        type: result.type || ContentTypeEnum.DEFAULT, // Verwende das Enum
        confidence: result.confidence,
        suggestedMetadata: result.suggestedMetadata || {}
      }
    } catch (error) {
      console.error('Fehler bei der Content-Type-Erkennung:', error)
      return {
        type: ContentTypeEnum.DEFAULT,
        confidence: 0,
        suggestedMetadata: {}
      }
    }
  }

  private async extractStructuredData(content: string, file?: File): Promise<{
    sections: StructuralElement[]
    metadata: Record<string, unknown>
  }> {
    console.log('[DocumentProcessor] Starte Strukturdaten-Extraktion')
    
    try {
        // Extrahiere Links und Themen
        console.log('[DocumentProcessor] Starte Link- und Themenextraktion')
        const links = await this.linkExtractor.extract(content)
        const relatedTopics = await this.extractRelatedTopics(content)
        const interactiveElements = this.extractInteractiveElements(content)
        const contactPoints = this.extractContactPoints(content)
        
        console.log('[DocumentProcessor] Extrahierte Daten:', {
            links: {
                internal: links.internal.length,
                external: links.external.length,
                media: links.media.length
            },
            relatedTopics,
            interactiveElements: interactiveElements.length,
            contactPoints: contactPoints.length
        })

        // Validiere Links
        console.log('[DocumentProcessor] Validiere Links')
        const validationResult = await this.linkExtractor.validate(links)
        if (!validationResult.valid) {
            console.warn('[DocumentProcessor] Link-Validierung fehlgeschlagen:', validationResult.error)
        }

        // Kategorisiere medizinische Links
        if (this.detector.getLastDetectedType() === 'medical') {
            links.external = links.external.map(link => ({
                ...link,
                trust: this.calculateMedicalTrustScore(link.domain)
            }))
            console.log('[DocumentProcessor] Medizinische Links kategorisiert')
        }

        // Extrahiere Strukturdaten
        const { sections, metadata } = await this.extractSectionsAndMetadata(content)
        
        return {
            sections,
            metadata: {
                ...metadata,
                links,
                relatedTopics,
                interactiveElements,
                contactPoints
            }
        }
    } catch (error) {
        console.error('[DocumentProcessor] Fehler bei der Strukturdaten-Extraktion:', error)
        this.monitoring?.recordError('extractStructuredData', error instanceof Error ? error.message : 'Unbekannter Fehler')
        return {
            sections: [],
            metadata: {}
        }
    }
  }

  private calculateMedicalTrustScore(domain: string): number {
    const trustedDomains = [
        'aok.de',
        'tk.de',
        'barmer.de',
        'dak.de',
        'who.int',
        'rki.de',
        'bundesaerztekammer.de',
        'kbv.de',
        'dimdi.de',
        'cochrane.org'
    ]
    
    if (trustedDomains.some(trusted => domain.includes(trusted))) {
        return 1.0
    }
    
    const medicalIndicators = [
        'gesundheit',
        'health',
        'medizin',
        'medical',
        'arzt',
        'doctor',
        'klinik',
        'clinic',
        'hospital',
        'praxis'
    ]
    
    const score = medicalIndicators.reduce((acc, indicator) => {
        return acc + (domain.includes(indicator) ? 0.1 : 0)
    }, 0.5)
    
    return Math.min(score, 0.9)
  }

  private async extractSectionsAndMetadata(content: string): Promise<{
    sections: StructuralElement[]
    metadata: Record<string, unknown>
  }> {
    const tree = await unified()
      .use(remarkParse)
      .use(remarkFrontmatter)
      .parse(content)

    const sections: StructuralElement[] = []
    const metadata: Record<string, unknown> = {}

    // Extrahiere Links und Medien
    try {
      const links = await this.linkExtractor.extract(content)
      metadata.links = links
    } catch (error) {
      console.error('Fehler bei der Link-Extraktion:', error)
      this.monitoring.recordError('link_extraction', error instanceof Error ? error.message : 'unknown')
    }

    // Extrahiere Strukturen aus dem Markdown AST
    // TODO: Implementiere die Extraktion basierend auf dem AST

    return {
      sections,
      metadata
    }
  }

  private extractInteractiveElements(content: string): InteractiveElement[] {
    const elements: InteractiveElement[] = []
    
    // Suche nach Buttons/Links mit spezifischen Aktionen
    const buttonPattern = /\[([^\]]+)\]\(([^)]+)\)(?:\{([^}]+)\})?/g
    let match
    
    while ((match = buttonPattern.exec(content)) !== null) {
      const [_, text, url, meta] = match
      let type: InteractiveElement['type'] = 'link'
      let priority = 1
      
      // Bestimme den Typ basierend auf der URL oder Meta-Informationen
      if (url.includes('form') || url.includes('kontakt')) {
        type = 'form'
      } else if (url.includes('download') || url.endsWith('.pdf')) {
        type = 'download'
      } else if (url.includes('tel:') || url.includes('mailto:')) {
        type = 'contact'
      }
      
      // Extrahiere Priorität aus Meta-Informationen
      if (meta) {
        const priorityMatch = meta.match(/priority:\s*(\d+)/)
        if (priorityMatch) {
          priority = parseInt(priorityMatch[1], 10)
        }
      }
      
      elements.push({
        type,
        text,
        action: url,
        priority
      })
    }
    
    return elements
  }

  private extractContactPoints(content: string): Array<{
    type: string
    value: string
    description?: string
  }> {
    const contactPoints: Array<{
      type: string
      value: string
      description?: string
    }> = []
    
    // Suche nach Telefonnummern
    const phonePattern = /(?:Tel(?:efon)?|Fon):\s*([+\d\s-()]+)/gi
    let phoneMatch
    while ((phoneMatch = phonePattern.exec(content)) !== null) {
      contactPoints.push({
        type: 'phone',
        value: phoneMatch[1].trim(),
        description: 'Telefon'
      })
    }
    
    // Suche nach E-Mail-Adressen
    const emailPattern = /(?:E-Mail|Mail|Email):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi
    let emailMatch
    while ((emailMatch = emailPattern.exec(content)) !== null) {
      contactPoints.push({
        type: 'email',
        value: emailMatch[1],
        description: 'E-Mail'
      })
    }
    
    // Suche nach Adressen
    const addressPattern = /(?:Adresse|Anschrift):\s*([^\n]+(?:\n[^\n]+)*)/gi
    let addressMatch
    while ((addressMatch = addressPattern.exec(content)) !== null) {
      contactPoints.push({
        type: 'address',
        value: addressMatch[1].trim().replace(/\n/g, ', '),
        description: 'Adresse'
      })
    }
    
    // Suche nach Öffnungszeiten
    const hoursPattern = /(?:Öffnungszeiten|Sprechzeiten):\s*([^\n]+(?:\n[^\n]+)*)/gi
    let hoursMatch
    while ((hoursMatch = hoursPattern.exec(content)) !== null) {
      contactPoints.push({
        type: 'hours',
        value: hoursMatch[1].trim(),
        description: 'Öffnungszeiten'
      })
    }
    
    return contactPoints
  }

  private async extractRelatedTopics(content: string): Promise<RelatedTopics> {
    try {
        // Extrahiere explizit markierte verwandte Themen
        const explicitTopics = this.extractExplicitTopics(content)
        
        // Analysiere den Content für implizite Themen
        const implicitTopics = await this.analyzeImplicitTopics(content)
        
        // Kombiniere und dedupliziere Themen
        const allTopics = [...new Set([...explicitTopics, ...implicitTopics])]
        
        // Sortiere nach Relevanz
        const rankedTopics = this.rankTopicsByRelevance(allTopics, content)
        
        return {
            topics: rankedTopics,
            suggestedQuestions: this.generateSuggestedQuestions(rankedTopics),
            interactiveElements: this.extractInteractiveElements(content)
        }
    } catch (error) {
        console.error('[DocumentProcessor] Fehler bei der Themenextraktion:', error)
        return {
            topics: [],
            suggestedQuestions: [],
            interactiveElements: []
        }
    }
  }

  private extractExplicitTopics(content: string): string[] {
    const topics: string[] = []
    
    // Suche nach "Das könnte Sie auch interessieren" Sektionen
    const interestPattern = /Das könnte Sie auch interessieren[:\s]*([\s\S]*?)(?:\n\n|$)/gi
    const matches = content.matchAll(interestPattern)
    
    for (const match of matches) {
        if (match[1]) {
            const section = match[1].trim()
            // Extrahiere Themen aus der Sektion
            const sectionTopics = section
                .split('\n')
                .map(line => line.replace(/^[-•*]\s*/, '').trim()) // Entferne Aufzählungszeichen
                .filter(Boolean)
            topics.push(...sectionTopics)
        }
    }
    
    // Suche nach "Mehr zum Thema" Sektionen
    const morePattern = /Mehr zum Thema[:\s]*([\s\S]*?)(?:\n\n|$)/gi
    const moreMatches = content.matchAll(morePattern)
    
    for (const match of moreMatches) {
        if (match[1]) {
            const section = match[1].trim()
            const sectionTopics = section
                .split('\n')
                .map(line => line.replace(/^[-•*]\s*/, '').trim())
                .filter(Boolean)
            topics.push(...sectionTopics)
        }
    }
    
    return topics
  }

  private async analyzeImplicitTopics(content: string): Promise<string[]> {
    try {
        // Teile den Content in Chunks
        const chunks = this.splitContentForTopicAnalysis(content)
        const allTopics: Set<string> = new Set()
        
        // Analysiere jeden Chunk separat
        for (const chunk of chunks) {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [
                    {
                        role: 'system',
                        content: 'Analysiere den Text und identifiziere die 3-5 wichtigsten Themen. Berücksichtige:'
                            + '\n- Hauptthemen und Unterthemen'
                            + '\n- Häufig erwähnte Konzepte'
                            + '\n- Implizite thematische Verbindungen'
                            + '\nGib die Themen als JSON-Array zurück.'
                    },
                    {
                        role: 'user',
                        content: chunk
                    }
                ],
                response_format: { type: 'json_object' }
            })

            if (response.choices[0].message.content) {
                const result = JSON.parse(response.choices[0].message.content)
                if (Array.isArray(result.topics)) {
                    result.topics.forEach((topic: string) => allTopics.add(topic))
                }
            }
        }

        // Konsolidiere die Themen
        return Array.from(allTopics)
    } catch (error) {
        console.error('[DocumentProcessor] Fehler bei der KI-Themenanalyse:', error)
        return []
    }
  }

  private splitContentForTopicAnalysis(content: string): string[] {
    const MAX_CHUNK_SIZE = 2000 // ~2000 Zeichen pro Chunk
    const chunks: string[] = []
    
    // Für XML-Dokumente
    if (content.trim().startsWith('<?xml')) {
        return this.splitXmlForTopicAnalysis(content, MAX_CHUNK_SIZE)
    }
    
    // Für normalen Text: Teile an Absätzen
    const paragraphs = content.split(/\n\s*\n/)
    let currentChunk = ''
    
    for (const paragraph of paragraphs) {
        if (currentChunk.length + paragraph.length > MAX_CHUNK_SIZE) {
            if (currentChunk) {
                chunks.push(currentChunk)
                currentChunk = ''
            }
            // Wenn ein einzelner Paragraph zu groß ist, teile ihn
            if (paragraph.length > MAX_CHUNK_SIZE) {
                const subChunks = this.splitLargeParagraph(paragraph, MAX_CHUNK_SIZE)
                chunks.push(...subChunks)
            } else {
                currentChunk = paragraph
            }
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + paragraph
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk)
    }
    
    return chunks
  }

  private splitXmlForTopicAnalysis(content: string, maxSize: number): string[] {
    try {
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(content, 'text/xml')
        const chunks: string[] = []
        
        // Extrahiere wichtige Metadaten
        const metadata = this.extractXmlMetadata(xmlDoc)
        chunks.push(metadata)
        
        // Finde relevante Inhaltssektionen
        const sections = select('//section|//content|//body|//text', xmlDoc)
        for (const section of sections) {
            const text = section.textContent || ''
            if (text.length > maxSize) {
                chunks.push(...this.splitLargeParagraph(text, maxSize))
            } else if (text.trim()) {
                chunks.push(text)
            }
        }
        
        return chunks
    } catch (error) {
        console.warn('[DocumentProcessor] Fehler beim XML-Splitting:', error)
        // Fallback: Behandle als normalen Text
        return this.splitLargeParagraph(content, maxSize)
    }
  }

  private splitLargeParagraph(text: string, maxSize: number): string[] {
    const chunks: string[] = []
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
    
    let currentChunk = ''
    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxSize) {
            if (currentChunk) {
                chunks.push(currentChunk)
                currentChunk = ''
            }
            if (sentence.length > maxSize) {
                // Teile sehr lange Sätze
                const parts = sentence.match(new RegExp(`.{1,${maxSize}}`, 'g')) || []
                chunks.push(...parts)
            } else {
                currentChunk = sentence
            }
        } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk)
    }
    
    return chunks
  }

  private rankTopicsByRelevance(topics: string[], content: string): string[] {
    return topics
        .map(topic => ({
            topic,
            score: this.calculateTopicRelevance(topic, content)
        }))
        .sort((a, b) => b.score - a.score)
        .map(item => item.topic) // Konvertiere zurück zu string[]
        .slice(0, 5) // Begrenzen auf die 5 relevantesten Themen
  }

  private calculateTopicRelevance(topic: string, content: string): number {
    let score = 0
    
    // Häufigkeit des Themas im Content
    const frequency = (content.match(new RegExp(topic, 'gi')) || []).length
    score += frequency * 0.3
    
    // Position im Dokument (frühere Erwähnungen sind wichtiger)
    const firstPosition = content.toLowerCase().indexOf(topic.toLowerCase())
    if (firstPosition !== -1) {
        score += (1 - firstPosition / content.length) * 0.4
    }
    
    // Länge des Themas (längere Themen sind oft spezifischer)
    score += Math.min(topic.length / 50, 1) * 0.3
    
    return score
  }

  private generateSuggestedQuestions(topics: string[]): string[] {
    return topics.map(topic => {
        // Generiere kontextbezogene Fragen
        if (topic.toLowerCase().includes('versicherung')) {
            return `Welche Leistungen sind bei ${topic} abgedeckt?`
        } else if (topic.toLowerCase().includes('behandlung')) {
            return `Wie läuft die ${topic} ab?`
        } else if (topic.toLowerCase().includes('vorsorge')) {
            return `Wann sollte ich zur ${topic} gehen?`
        } else {
            return `Was sollte ich über ${topic} wissen?`
        }
    })
  }

  private extractTitle(content: string): string | null {
    // Suche nach der ersten Überschrift (# oder ##)
    const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/^##\s+(.+)$/m)
    if (titleMatch) {
      return titleMatch[1].trim()
    }
    return null
  }

  private async detectLanguage(content: string): Promise<string> {
    // Einfache Spracherkennung basierend auf häufigen deutschen Wörtern
    const germanWords = ['der', 'die', 'das', 'und', 'in', 'den', 'von', 'mit', 'bei', 'für']
    const contentWords = content.toLowerCase().split(/\W+/)
    const germanWordCount = contentWords.filter(word => germanWords.includes(word)).length
    
    // Wenn mehr als 5% der Wörter deutsch sind, nehmen wir Deutsch an
    return germanWordCount / contentWords.length > 0.05 ? 'de' : 'en'
  }

  private cleanContent(content: string): string {
    // Entferne BOM und andere unsichtbare Zeichen am Anfang
    content = content.replace(/^\uFEFF/, '')
    
    // Normalisiere Zeilenumbrüche
    content = content.replace(/\r\n/g, '\n')
    
    // Stelle sicher, dass Markdown-Syntax korrekt ist
    content = content
      // Korrigiere Bilder
      .replace(/!\s*\[/g, '![')
      .replace(/\]\s*\(/g, '](')
      // Korrigiere Links
      .replace(/\[\s+/g, '[')
      .replace(/\s+\]/g, ']')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
    
    return content
  }
} 