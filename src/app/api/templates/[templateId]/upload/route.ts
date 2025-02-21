import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { ContentVectorizer } from '@/lib/services/vectorizer'
import { ContentDetector } from '@/lib/services/detector'
import { OpenAIService } from '@/lib/services/ai/openai'
import { ContentTypeRegistry, ContentTypeDefinition, BaseContentTypes } from '@/lib/types/contentTypes'
import { parseStringPromise } from 'xml2js'
import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import { XMLParser } from 'fast-xml-parser'
import { Readable } from 'stream'
import { ChunkManager } from '@/lib/services/upload/chunk-manager'

// Initialisiere Registry
const registry: ContentTypeRegistry = {
  register: async (definition: ContentTypeDefinition): Promise<void> => {
    // Implementierung hier
  },
  get: async (id: string): Promise<ContentTypeDefinition | undefined> => {
    // Implementierung hier
    return undefined;
  },
  list: async (): Promise<ContentTypeDefinition[]> => {
    // Implementierung hier
    return [];
  },
  update: async (id: string, definition: Partial<ContentTypeDefinition>): Promise<void> => {
    // Implementierung hier
  },
  remove: async (id: string): Promise<void> => {
    // Implementierung hier
  },
  validateContent: async (content: string, typeId: string): Promise<boolean> => {
    // Implementierung hier
    return false;
  }
}

// Initialisiere Services
const openai = new OpenAIService({ 
  apiKey: process.env.OPENAI_API_KEY || '',
  registry
})
const detector = new ContentDetector(openai)
const vectorizer = new ContentVectorizer({
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  pineconeApiKey: process.env.PINECONE_API_KEY || '',
  pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
  pineconeIndex: process.env.PINECONE_INDEX || '',
  templateId: ''  // Wird pro Request gesetzt
})

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
    processingStats?: {
      totalChunks: number;
      successfulChunks: number;
      averageTokensPerChunk: number;
    };
  };
}

interface TopicSection {
  content: string
  startIndex: number
  endIndex: number
  confidence: number
  type: string
  metadata: {
    domain: string
    subDomain: string
    keywords: string[]
    coverage: string[]
    classification?: {
      type: string
      purpose: string
      audience: string
    }
    relationships?: {
      parentTopic: string
      relatedTopics: string[]
    }
    [key: string]: any
  }
}

interface ExtendedVectorResult extends VectorResult {
  metadata?: {
    count: number
    timestamp: string
    templateId: string
    sections?: Array<{
      type: string
      confidence: number
      metadata: TopicSection['metadata']
    }>
  }
}

interface TopicCluster {
  mainTopic: TopicSection
  relatedTopics: TopicSection[]
  confidence: number
  metadata: {
    domain: string
    subDomain: string
    keywords: string[]
    coverage: string[]
    relationships: {
      parentTopic?: string
      relatedTopics: string[]
    }
  }
}

// Konstanten für Chunk-Größen und Limits
const CHUNK_SIZE = 1024 * 1024 // 1MB für Datei-Chunks
const MAX_TOKENS_PER_REQUEST = 4000 // Halbiere das Limit für Sicherheitspuffer
const RATE_LIMIT_DELAY = 60000 // 1 Minute Wartezeit zwischen großen Anfragen
const AVG_CHARS_PER_TOKEN = 4 // Durchschnittliche Zeichen pro Token
const MAX_RETRIES = 3 // Maximale Anzahl von Wiederholungsversuchen

interface OpenAIRateLimitError extends Error {
  code: string;
  status: number;
  param: string | null;
  type: string;
}

/** @deprecated Wird durch ChunkManager.estimateTokenCount ersetzt */
function estimateTokenCount(text: string): number {
  // Berücksichtige Sonderzeichen und Whitespace
  const cleanedText = text.replace(/\s+/g, ' ').trim()
  return Math.ceil(cleanedText.length / AVG_CHARS_PER_TOKEN)
}

/** @deprecated Wird durch ChunkManager.splitContentIntoChunks ersetzt */
async function splitContentIntoChunks(content: string): Promise<string[]> {
  const chunks: string[] = [];
  const sentences = content.split(/[.!?]+\s+/);
  let currentChunk = '';
  let currentTokens = 0;
  
  for (const sentence of sentences) {
    const sentenceTokens = estimateTokenCount(sentence);
    
    // Wenn der Satz selbst zu lang ist, teile ihn in Wörter
    if (sentenceTokens > MAX_TOKENS_PER_REQUEST) {
      const words = sentence.split(/\s+/);
      let subChunk = '';
      let subTokens = 0;
      
      for (const word of words) {
        const wordTokens = estimateTokenCount(word);
        if (subTokens + wordTokens > MAX_TOKENS_PER_REQUEST) {
          if (subChunk) {
            chunks.push(subChunk.trim());
          }
          subChunk = word;
          subTokens = wordTokens;
        } else {
          subChunk += ' ' + word;
          subTokens += wordTokens;
        }
      }
      
      if (subChunk) {
        chunks.push(subChunk.trim());
      }
      continue;
    }
    
    // Normale Chunk-Bildung für kürzere Sätze
    if (currentTokens + sentenceTokens > MAX_TOKENS_PER_REQUEST) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence + '. ';
      currentTokens = sentenceTokens;
    } else {
      currentChunk += sentence + '. ';
      currentTokens += sentenceTokens;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  console.log(`Content in ${chunks.length} Chunks aufgeteilt. Durchschnittliche Token pro Chunk: ${
    Math.round(chunks.reduce((sum, chunk) => sum + estimateTokenCount(chunk), 0) / chunks.length)
  }`);
  
  return chunks;
}

interface ChunkMetadata {
  [key: string]: string | number | boolean | string[];
  chunk_index: string;
  chunk_total: string;
  chunk_token_count: string;
  chunk_retry_count: string;
  section_range_start: string;
  section_range_end: string;
}

async function vectorizeWithRateLimit(
  vectorizer: ContentVectorizer,
  content: string,
  metadata: Record<string, any>
): Promise<VectorResult> {
  let retryCount = 0;
  
  // Neue ChunkManager-Instanz
  const chunkManager = new ChunkManager({
    maxTokens: MAX_TOKENS_PER_REQUEST,
    avgCharsPerToken: AVG_CHARS_PER_TOKEN
  });
  
  // Verwende neuen ChunkManager
  const chunks = await chunkManager.splitContentIntoChunks(content);
  const results: VectorResult[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const tokenCount = chunkManager.estimateTokenCount(chunk);
    
    console.log(`Verarbeite Chunk ${i + 1}/${chunks.length} (ca. ${tokenCount} Token)`);
    
    while (retryCount < MAX_RETRIES) {
      try {
        // Bereite die Metadaten für Pinecone vor
        const baseMetadata: ChunkMetadata = {
          chunk_index: String(i + 1),
          chunk_total: String(chunks.length),
          chunk_token_count: String(tokenCount),
          chunk_retry_count: String(retryCount),
          section_range_start: String(metadata.section_range?.start || 0),
          section_range_end: String(metadata.section_range?.end || 0)
        };

        // Konvertiere zusätzliche Metadaten
        const additionalMetadata = Object.entries(metadata).reduce((acc, [key, value]) => {
          if (key !== 'chunk_info' && key !== 'section_range') {
            if (Array.isArray(value)) {
              acc[key] = JSON.stringify(value);
            } else if (typeof value === 'object' && value !== null) {
              acc[key] = JSON.stringify(value);
            } else {
              acc[key] = String(value);
            }
          }
          return acc;
        }, {} as Record<string, string>);

        const chunkMetadata = {
          ...baseMetadata,
          ...additionalMetadata
        };
        
        const result = await vectorizer.vectorize({
          content: chunk,
          metadata: chunkMetadata
        });
        
        if (result?.vectors) {
          results.push(result);
          console.log(`Chunk ${i + 1} erfolgreich vektorisiert`);
          retryCount = 0;
          
          if (i < chunks.length - 1) {
            const waitTime = Math.min(
              RATE_LIMIT_DELAY * (tokenCount / MAX_TOKENS_PER_REQUEST),
              RATE_LIMIT_DELAY
            );
            console.log(`Warte ${Math.round(waitTime / 1000)} Sekunden vor nächstem Chunk...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          
          break;
        }
      } catch (error: any) {
        retryCount++;
        console.warn(`Fehler bei Chunk ${i + 1}, Versuch ${retryCount}/${MAX_RETRIES}:`, error.message);
        
        if (error.message.includes('maximum context length')) {
          // Verwende ChunkManager für Neuaufteilung
          const subChunks = await chunkManager.splitContentIntoChunks(chunk);
          chunks.splice(i, 1, ...subChunks);
          i--; // Wiederhole mit dem ersten Sub-Chunk
          break;
        }
        
        if (error.code === 'rate_limit_exceeded') {
          console.log('Rate Limit erreicht, warte eine Minute...');
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
          continue;
        }
        
        if (retryCount === MAX_RETRIES) {
          throw new Error(`Maximale Anzahl von Wiederholungsversuchen erreicht für Chunk ${i + 1}`);
        }
        
        // Exponentielles Backoff
        const waitTime = Math.min(1000 * Math.pow(2, retryCount), RATE_LIMIT_DELAY);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  return {
    vectors: results.flatMap(r => r.vectors),
    metadata: {
      count: results.reduce((sum, r) => sum + (r.metadata?.count || 0), 0),
      timestamp: new Date().toISOString(),
      templateId: metadata.templateId,
      processingStats: {
        totalChunks: chunks.length,
        successfulChunks: results.length,
        averageTokensPerChunk: Math.round(
          chunks.reduce((sum, chunk) => sum + estimateTokenCount(chunk), 0) / chunks.length
        )
      }
    }
  };
}

async function* createChunkGenerator(file: File) {
  const reader = file.stream().getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      yield value
    }
  } finally {
    reader.releaseLock()
  }
}

interface XMLParserOptions {
  ignoreAttributes: boolean
  parseAttributeValue: boolean
  allowBooleanAttributes: boolean
  isArray: (name: string, jpath: string, isLeafNode: boolean, isAttribute: boolean) => boolean
}

type XMLPrimitive = string | number | boolean | null
type XMLValue = XMLPrimitive | { [key: string]: XMLValue } | XMLValue[]

function isXMLValue(value: unknown): value is XMLValue {
  if (value === null) return true
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true
  if (Array.isArray(value)) return value.every(isXMLValue)
  if (typeof value === 'object') return Object.values(value as object).every(isXMLValue)
  return false
}

function extractTextFromXML(obj: XMLValue): string {
  if (obj === null) return ''
  if (typeof obj === 'string') return obj
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj)
  if (Array.isArray(obj)) return obj.map(item => extractTextFromXML(item)).join(' ')
  return Object.values(obj)
    .filter((value): value is XMLValue => value !== undefined)
    .map(value => extractTextFromXML(value))
    .join(' ')
}

async function processLargeFile(file: File, fileType: 'xml' | 'md'): Promise<string> {
  let content = ''
  
  if (fileType === 'xml') {
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: true,
      allowBooleanAttributes: true,
      isArray: () => false,
      parseTagValue: true,
      trimValues: true
    } as XMLParserOptions)
    
    let xmlBuffer = ''
    
    for await (const chunk of createChunkGenerator(file)) {
      xmlBuffer += new TextDecoder().decode(chunk)
      
      while (xmlBuffer.includes('</')) {
        const endIndex = xmlBuffer.indexOf('</') + xmlBuffer.slice(xmlBuffer.indexOf('</')).indexOf('>') + 1
        if (endIndex === -1) break
        
        const xmlChunk = xmlBuffer.slice(0, endIndex)
        xmlBuffer = xmlBuffer.slice(endIndex)
        
        try {
          const parsed = parser.parse(xmlChunk)
          if (isXMLValue(parsed)) {
            content += extractTextFromXML(parsed) + ' '
          }
        } catch (error) {
          console.warn('Warnung beim Parsen eines XML-Chunks:', error)
        }
      }
    }
    
    if (xmlBuffer) {
      try {
        const parsed = parser.parse(xmlBuffer)
        if (isXMLValue(parsed)) {
          content += extractTextFromXML(parsed)
        }
      } catch (error) {
        console.warn('Warnung beim Parsen des letzten XML-Chunks:', error)
      }
    }
  } else if (fileType === 'md') {
    let mdBuffer = ''
    
    for await (const chunk of createChunkGenerator(file)) {
      mdBuffer += new TextDecoder().decode(chunk)
      
      if (mdBuffer.length > CHUNK_SIZE) {
        content += await processMarkdownChunk(mdBuffer)
        mdBuffer = ''
      }
    }
    
    if (mdBuffer) {
      content += await processMarkdownChunk(mdBuffer)
    }
  }

  return content.trim()
}

async function processMarkdownChunk(chunk: string): Promise<string> {
  return chunk
    .replace(/[#*_`~]/g, '') // Entferne Markdown-Syntax
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Extrahiere Text aus Links
    .replace(/\n\s*\n/g, '\n') // Reduziere mehrfache Leerzeilen
    .trim() + '\n'
}

async function extractContent(file: File): Promise<string> {
  const fileSize = file.size
  
  // Wenn die Datei größer als 5MB ist, verwende Chunk-Verarbeitung
  if (fileSize > 5 * 1024 * 1024) {
    console.log(`Große Datei erkannt (${(fileSize / 1024 / 1024).toFixed(2)}MB), verwende Chunk-Verarbeitung`)
    
    if (file.name.endsWith('.xml')) {
      return await processLargeFile(file, 'xml')
    } else if (file.name.endsWith('.md')) {
      return await processLargeFile(file, 'md')
    }
  }
  
  // Für kleinere Dateien: Bisherige Verarbeitung
  const content = await file.text()
  
  if (file.name.endsWith('.xml')) {
    try {
      const result = await parseStringPromise(content, {
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true
      })
      
      const extractedText = extractTextFromXML(result)
      console.log('Extrahierter Text aus XML:', extractedText.substring(0, 100) + '...')
      return extractedText
    } catch (error) {
      console.error('Fehler beim XML-Parsing:', error)
      throw new Error('Ungültiges XML-Format')
    }
  }
  
  return content
}

interface HandlerMetadata {
  suggestedMetadata?: {
    domain?: string
    subDomain?: string
  }
  documentCount?: number
  documents?: Array<{
    filename: string
    addedAt: string
    confidence: number
  }>
  generated?: boolean
  timestamp?: string
  lastUpdate?: string
}

interface HandlerConfigMetadata {
  keywords?: string[]
  coverage?: string[]
  relatedTopics?: string[]
  relationships?: {
    parentTopic?: string
    relatedTopics: string[]
  }
}

interface HandlerConfigSettings {
  matchThreshold: number
  contextWindow: number
  maxTokens: number
  dynamicResponses: boolean
  includeLinks?: boolean
  includeContact?: boolean
  includeSteps?: boolean
  includePrice?: boolean
  includeAvailability?: boolean
  useExactMatches?: boolean
}

interface HandlerConfig {
  capabilities: string[]
  patterns: any[]
  metadata: HandlerConfigMetadata
  settings: HandlerConfigSettings
}

// Hilfsfunktion zum sicheren JSON-Parsing
function safeJSONParse<T>(value: string | null | undefined, defaultValue: T): T {
  if (!value) return defaultValue
  try {
    const parsed = JSON.parse(value)
    return parsed as T
  } catch (error) {
    console.warn('Fehler beim JSON-Parsing:', error)
    return defaultValue
  }
}

// Berechne die Ähnlichkeit zwischen zwei Themen
function calculateTopicSimilarity(topic1: TopicSection, topic2: TopicSection): number {
  let similarity = 0;
  
  // Domain-Übereinstimmung
  if (topic1.metadata.domain === topic2.metadata.domain) similarity += 0.3;
  if (topic1.metadata.subDomain === topic2.metadata.subDomain) similarity += 0.2;
  
  // Keyword-Überlappung
  const keywords1 = new Set(topic1.metadata.keywords);
  const keywords2 = new Set(topic2.metadata.keywords);
  const commonKeywords = new Set([...keywords1].filter(x => keywords2.has(x)));
  similarity += 0.3 * (commonKeywords.size / Math.max(keywords1.size, keywords2.size));
  
  // Coverage-Überlappung
  const coverage1 = new Set(topic1.metadata.coverage);
  const coverage2 = new Set(topic2.metadata.coverage);
  const commonCoverage = new Set([...coverage1].filter(x => coverage2.has(x)));
  similarity += 0.2 * (commonCoverage.size / Math.max(coverage1.size, coverage2.size));
  
  return similarity;
}

// Gruppiere ähnliche Themen
async function clusterTopics(sections: TopicSection[]): Promise<TopicCluster[]> {
  const clusters: TopicCluster[] = [];
  const processedSections = new Set<number>();
  
  // Sortiere Sections nach Confidence absteigend
  const sortedSections = [...sections].sort((a, b) => b.confidence - a.confidence);
  
  for (let i = 0; i < sortedSections.length; i++) {
    if (processedSections.has(i)) continue;
    
    const mainTopic = sortedSections[i];
    const relatedTopics: TopicSection[] = [];
    
    // Suche ähnliche Themen
    for (let j = 0; j < sortedSections.length; j++) {
      if (i === j || processedSections.has(j)) continue;
      
      const similarity = calculateTopicSimilarity(mainTopic, sortedSections[j]);
      if (similarity >= 0.7) { // Schwellenwert für Ähnlichkeit
        relatedTopics.push(sortedSections[j]);
        processedSections.add(j);
      }
    }
    
    // Erstelle Cluster
    clusters.push({
      mainTopic,
      relatedTopics,
      confidence: mainTopic.confidence,
      metadata: {
        domain: mainTopic.metadata.domain,
        subDomain: mainTopic.metadata.subDomain,
        keywords: Array.from(new Set([
          ...mainTopic.metadata.keywords,
          ...relatedTopics.flatMap(t => t.metadata.keywords)
        ])),
        coverage: Array.from(new Set([
          ...mainTopic.metadata.coverage,
          ...relatedTopics.flatMap(t => t.metadata.coverage)
        ])),
        relationships: {
          relatedTopics: Array.from(new Set([
            ...(mainTopic.metadata.relationships?.relatedTopics || []),
            ...relatedTopics.flatMap(t => t.metadata.relationships?.relatedTopics || [])
          ]))
        }
      }
    });
    
    processedSections.add(i);
  }
  
  return clusters;
}

// Verbesserte Handler-Generierung mit Clustering
async function generateHandlersForTopics(
  templateId: string,
  sections: TopicSection[],
  existingHandlers: any[]
): Promise<string[]> {
  const clusters = await clusterTopics(sections);
  const handlerIds: string[] = [];
  
  for (const cluster of clusters) {
    // Suche nach ähnlichem existierenden Handler
    const similarHandler = existingHandlers.find(handler => {
      try {
        const handlerMeta = safeJSONParse<HandlerMetadata>(handler.metadata as string, {});
        const handlerConfig = safeJSONParse<HandlerConfig>(handler.config as string, {
          capabilities: [],
          patterns: [],
          metadata: {},
          settings: {
            matchThreshold: 0.8,
            contextWindow: 1000,
            maxTokens: 2000,
            dynamicResponses: true
          }
        });
        
        // Erweiterte Ähnlichkeitsprüfung
        const domainMatch = handlerMeta.suggestedMetadata?.domain === cluster.metadata.domain;
        const subDomainMatch = handlerMeta.suggestedMetadata?.subDomain === cluster.metadata.subDomain;
        
        const keywords = new Set([
          ...(handlerConfig.metadata?.keywords || []),
          ...cluster.metadata.keywords
        ]);
        const keywordOverlap = keywords.size < (
          (handlerConfig.metadata?.keywords?.length || 0) +
          cluster.metadata.keywords.length
        );
        
        return (
          handler.templateId === templateId &&
          (domainMatch || subDomainMatch || keywordOverlap)
        );
      } catch (error) {
        console.error(`Fehler beim Parsen der Handler-Daten:`, error);
        return false;
      }
    });
    
    if (similarHandler) {
      // Aktualisiere existierenden Handler
      const handlerConfig = safeJSONParse<HandlerConfig>(similarHandler.config as string, {
        capabilities: [],
        patterns: [],
        metadata: {},
        settings: {
          matchThreshold: 0.8,
          contextWindow: 1000,
          maxTokens: 2000,
          dynamicResponses: true
        }
      });
      const handlerMeta = safeJSONParse<HandlerMetadata>(similarHandler.metadata as string, {});
      
      const updatedConfig = {
        ...handlerConfig,
        metadata: {
          ...handlerConfig.metadata,
          keywords: Array.from(new Set([
            ...(handlerConfig.metadata?.keywords || []),
            ...cluster.metadata.keywords
          ])),
          coverage: Array.from(new Set([
            ...(handlerConfig.metadata?.coverage || []),
            ...cluster.metadata.coverage
          ])),
          relationships: {
            ...handlerConfig.metadata?.relationships,
            relatedTopics: Array.from(new Set([
              ...(handlerConfig.metadata?.relationships?.relatedTopics || []),
              ...cluster.metadata.relationships.relatedTopics
            ]))
          }
        }
      };
      
      await prisma.template_handlers.update({
        where: { id: similarHandler.id },
        data: {
          config: JSON.stringify(updatedConfig),
          metadata: JSON.stringify({
            ...handlerMeta,
            lastUpdate: new Date().toISOString(),
            documentCount: (handlerMeta.documentCount || 1) + 1
          })
        }
      });
      
      handlerIds.push(similarHandler.id);
    } else {
      // Erstelle neuen Handler für das Cluster
      const handlerId = nanoid();
      const capabilities = ['search', 'extract'];
      
      // Füge spezifische Capabilities basierend auf dem Content-Type hinzu
      if (cluster.mainTopic.type === BaseContentTypes.SERVICE) capabilities.push('service');
      if (cluster.mainTopic.type === BaseContentTypes.PRODUCT) capabilities.push('product');
      if (cluster.mainTopic.type === BaseContentTypes.FAQ) capabilities.push('faq');
      if (cluster.mainTopic.type === BaseContentTypes.CONTACT) capabilities.push('contact');
      if (cluster.mainTopic.type === BaseContentTypes.EVENT) capabilities.push('event');
      
      const handler = await prisma.template_handlers.create({
        data: {
          id: handlerId,
          templateId,
          type: cluster.mainTopic.type,
          name: `${cluster.metadata.domain} - ${cluster.metadata.subDomain}`,
          active: true,
          config: JSON.stringify({
            capabilities,
            patterns: [], // Wird aus dem Content generiert
            metadata: cluster.metadata,
            settings: {
              matchThreshold: 0.8,
              contextWindow: 1000,
              maxTokens: 2000,
              dynamicResponses: true,
              includeLinks: cluster.mainTopic.type === BaseContentTypes.DOWNLOAD,
              includeContact: cluster.mainTopic.type === BaseContentTypes.CONTACT,
              includeSteps: cluster.mainTopic.type === BaseContentTypes.SERVICE || cluster.mainTopic.type === BaseContentTypes.PRODUCT,
              includePrice: cluster.mainTopic.type === BaseContentTypes.PRODUCT || cluster.mainTopic.type === BaseContentTypes.SERVICE,
              includeAvailability: cluster.mainTopic.type === BaseContentTypes.EVENT || cluster.mainTopic.type === BaseContentTypes.SERVICE,
              useExactMatches: cluster.confidence > 0.9
            }
          }),
          metadata: JSON.stringify({
            generated: true,
            timestamp: new Date().toISOString(),
            documentCount: 1,
            suggestedMetadata: cluster.metadata
          })
        }
      });
      
      handlerIds.push(handler.id);
    }
  }
  
  return handlerIds;
}

// Themen-Erkennung und Segmentierung
async function detectTopicSections(content: string, detector: ContentDetector): Promise<TopicSection[]> {
  const sections: TopicSection[] = [];
  const paragraphs = content.split(/\n\s*\n/);
  
  let currentIndex = 0;
  let currentContent = '';
  let lastType = '';
  let lastMetadata = null;
  
  for (const paragraph of paragraphs) {
    if (paragraph.trim().length < 50) {
      currentContent += paragraph + '\n\n';
      currentIndex += paragraph.length + 2;
      continue;
    }
    
    const contentType = await detector.detect(paragraph);
    
    if (contentType.type !== lastType && lastType !== '') {
      if (currentContent.trim()) {
        sections.push({
          content: currentContent.trim(),
          startIndex: currentIndex - currentContent.length,
          endIndex: currentIndex,
          confidence: contentType.confidence,
          type: lastType,
          metadata: {
            domain: lastMetadata?.domain || '',
            subDomain: lastMetadata?.subDomain || '',
            keywords: lastMetadata?.keywords || [],
            coverage: lastMetadata?.coverage || [],
            ...lastMetadata
          }
        });
      }
      currentContent = paragraph + '\n\n';
    } else {
      currentContent += paragraph + '\n\n';
    }
    
    lastType = contentType.type;
    lastMetadata = contentType.metadata;
    currentIndex += paragraph.length + 2;
  }
  
  if (currentContent.trim()) {
    sections.push({
      content: currentContent.trim(),
      startIndex: currentIndex - currentContent.length,
      endIndex: currentIndex,
      confidence: sections.length > 0 ? sections[sections.length - 1].confidence : 1,
      type: lastType,
      metadata: {
        domain: lastMetadata?.domain || '',
        subDomain: lastMetadata?.subDomain || '',
        keywords: lastMetadata?.keywords || [],
        coverage: lastMetadata?.coverage || [],
        ...lastMetadata
      }
    });
  }
  
  return sections;
}

// Erweiterte Vektorisierung für Multi-Themen-Dokumente
async function vectorizeMultiTopicContent(
  vectorizer: ContentVectorizer,
  sections: TopicSection[],
  baseMetadata: Record<string, any>
): Promise<ExtendedVectorResult> {
  const allResults: VectorResult[] = [];
  
  for (const section of sections) {
    const sectionMetadata = {
      ...baseMetadata,
      section_type: section.type,
      section_confidence: section.confidence,
      section_metadata: section.metadata,
      section_range: {
        start: section.startIndex,
        end: section.endIndex
      }
    };
    
    const result = await vectorizeWithRateLimit(vectorizer, section.content, sectionMetadata);
    if (result?.vectors) {
      allResults.push(result);
    }
  }
  
  // Kombiniere alle Vektoren
  return {
    vectors: allResults.flatMap(r => r.vectors),
    metadata: {
      count: allResults.reduce((sum, r) => sum + (r.metadata?.count || 0), 0),
      timestamp: new Date().toISOString(),
      templateId: baseMetadata.templateId,
      sections: sections.map(s => ({
        type: s.type,
        confidence: s.confidence,
        metadata: s.metadata
      }))
    }
  };
}

export async function POST(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'Keine Dateien gefunden' },
        { status: 400 }
      )
    }

    // Erstelle einen Job für den Upload
    const jobId = nanoid()
    const uploadJob = await prisma.uploadJob.create({
      data: {
        id: jobId,
        templateId: params.templateId,
        status: 'uploading',
        totalFiles: files.length,
        processedFiles: 0,
        metadata: {
          fileNames: files.map(f => f.name),
          sizes: files.map(f => f.size),
          types: files.map(f => f.type)
        }
      }
    })

    // Starte den Upload-Prozess asynchron
    processUpload(jobId, files, params.templateId)

    return NextResponse.json({ jobId })
  } catch (error) {
    console.error('Fehler beim Upload:', error)
    return NextResponse.json(
      { error: 'Fehler beim Upload' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

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

    // Berechne den Fortschritt
    const progress = (job.processedFiles / job.totalFiles) * 100

    return NextResponse.json({
      stage: job.status,
      progress,
      message: getStatusMessage(job.status),
      details: job.metadata
    })
  } catch (error) {
    console.error('Fehler beim Status-Check:', error)
    return NextResponse.json(
      { error: 'Fehler beim Status-Check' },
      { status: 500 }
    )
  }
}

async function processUpload(jobId: string, files: File[], templateId: string) {
  const startTime = new Date().toISOString()
  let totalVectorCount = 0

  try {
    console.log(`[Upload ${jobId}] Starte Upload-Verarbeitung für Template ${templateId}`)
    console.log(`[Upload ${jobId}] Anzahl Dateien: ${files.length}`)

    // Aktualisiere den Job-Status mit erweiterten Metadaten
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: 'processing',
        totalFiles: files.length,
        processedFiles: 0,
        metadata: {
          startTime: startTime,
          totalFiles: files.length,
          currentOperation: 'Initialisiere Verarbeitung',
          processingDetails: {
            stage: 'start',
            message: 'Starte Verarbeitung',
            estimatedTimeRemaining: `${files.length * 2} Minuten` // Schätzung: 2 Minuten pro Datei
          }
        }
      }
    })

    // Warte kurz, um die Initialisierung zu simulieren
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Initialisiere Services
    console.log(`[Upload ${jobId}] Initialisiere Services...`)
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        metadata: {
          currentOperation: 'Initialisiere KI-Services',
          processingDetails: {
            stage: 'init',
            message: 'Initialisiere KI-Services und Vektorisierung',
            step: 1,
            totalSteps: 4
          }
        }
      }
    })

    // Warte auf Service-Initialisierung
    await new Promise(resolve => setTimeout(resolve, 3000))

    const openai = new OpenAIService({ apiKey: process.env.OPENAI_API_KEY || '', registry })
    const detector = new ContentDetector(openai)
    const vectorizer = new ContentVectorizer({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      pineconeApiKey: process.env.PINECONE_API_KEY || '',
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
      pineconeIndex: process.env.PINECONE_INDEX || '',
      templateId
    })

    // Verarbeite jede Datei
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      console.log(`[Upload ${jobId}] Verarbeite Datei ${i + 1}/${files.length}: ${file.name}`)

      try {
        // Erstelle Upload-Verzeichnis
        const uploadDir = join(process.cwd(), 'uploads', templateId)
        await mkdir(uploadDir, { recursive: true })
        
        // Speichere Datei
        console.log(`[Upload ${jobId}] Speichere Datei ${file.name}...`)
        await prisma.uploadJob.update({
          where: { id: jobId },
          data: {
            metadata: {
              currentOperation: `Speichere Datei ${file.name}`,
              currentFile: file.name,
              processingDetails: {
                stage: 'save',
                message: `Speichere Datei ${i + 1} von ${files.length}`,
                step: 2,
                totalSteps: 4,
                estimatedTimeRemaining: `${(files.length - i) * 2} Minuten`
              }
            }
          }
        })

        const buffer = await file.arrayBuffer()
        const filePath = join(uploadDir, file.name)
        await writeFile(filePath, Buffer.from(buffer))

        // Simuliere Dateispeicherung
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Extrahiere Text mit XML-Unterstützung
        console.log(`[Upload ${jobId}] Extrahiere Text aus ${file.name}...`)
        await prisma.uploadJob.update({
          where: { id: jobId },
          data: {
            metadata: {
              currentOperation: `Extrahiere Text aus ${file.name}`,
              processingDetails: {
                stage: 'extract',
                message: file.name.endsWith('.xml') ? 
                  'Extrahiere und analysiere XML-Struktur' : 
                  'Extrahiere und analysiere Text',
                step: 3,
                totalSteps: 4
              }
            }
          }
        })

        const content = await extractContent(file)
        console.log(`[Upload ${jobId}] Analysiere Themen in ${file.name}...`)
        
        const sections = await detectTopicSections(content, detector)
        console.log(`[Upload ${jobId}] ${sections.length} verschiedene Themenbereiche erkannt`)
        
        // Erstelle oder aktualisiere Handler für jeden Themenbereich
        const handlerIds = await generateHandlersForTopics(templateId, sections, 
          await prisma.template_handlers.findMany({
            where: { templateId }
          })
        )

        console.log(`[Upload ${jobId}] ${handlerIds.length} Handler erstellt/aktualisiert`)

        // Vektorisiere Content
        console.log(`[Upload ${jobId}] Vektorisiere Content von ${file.name} mit Themen-Informationen...`)
        const vectorResult = await vectorizeMultiTopicContent(vectorizer, sections, {
          filename: file.name,
          path: filePath,
          templateId
        })

        if (!vectorResult?.vectors) {
          throw new Error('Keine Vektoren generiert')
        }

        totalVectorCount += vectorResult.vectors.length

        // Aktualisiere Job-Status
        console.log(`[Upload ${jobId}] Aktualisiere Job-Status für ${file.name}...`)
        await prisma.uploadJob.update({
          where: { id: jobId },
          data: {
            processedFiles: i + 1,
            metadata: {
              lastProcessedFile: file.name,
              lastUpdateTime: new Date().toISOString(),
              processingDetails: {
                stage: 'complete',
                message: `Datei ${i + 1} von ${files.length} verarbeitet`,
                progress: ((i + 1) / files.length) * 100
              },
              currentOperation: `Datei ${file.name} verarbeitet`,
              vectorCount: vectorResult.vectors.length,
              vectorMetadata: vectorResult.metadata
            }
          }
        })

      } catch (error) {
        console.error(`[Upload ${jobId}] Fehler bei Datei ${file.name}:`, error)
        await prisma.uploadJob.update({
          where: { id: jobId },
          data: {
            metadata: {
              error: error instanceof Error ? error.message : 'Unbekannter Fehler',
              errorDetails: error instanceof Error ? error.stack : undefined,
              errorFile: file.name,
              processingDetails: {
                stage: 'error',
                message: `Fehler bei Verarbeitung von ${file.name}`
              }
            }
          }
        })
        throw error
      }
    }

    // Setze Job auf completed mit finalen Metadaten
    const endTime = new Date()
    const processingTime = endTime.getTime() - new Date(startTime).getTime()
    
    console.log(`[Upload ${jobId}] Upload-Verarbeitung abgeschlossen`)
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        metadata: {
          completionTime: endTime.toISOString(),
          processingDetails: {
            stage: 'completed',
            message: 'Alle Dateien erfolgreich verarbeitet'
          },
          currentOperation: 'Verarbeitung abgeschlossen',
          finalStats: {
            totalFiles: files.length,
            totalProcessingTime: processingTime,
            averageVectorCount: totalVectorCount / files.length,
            totalVectors: totalVectorCount
          }
        }
      }
    })

  } catch (error) {
    console.error(`[Upload ${jobId}] Kritischer Fehler:`, error)
    
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: 'error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unbekannter Fehler',
          errorTime: new Date().toISOString(),
          errorDetails: error instanceof Error ? error.stack : undefined,
          processingDetails: {
            stage: 'error',
            message: 'Kritischer Fehler bei der Verarbeitung'
          }
        }
      }
    })
    
    throw error
  }
}

function getStatusMessage(status: string): string {
  switch (status) {
    case 'uploading':
      return 'Dateien werden hochgeladen...'
    case 'processing':
      return 'Dateien werden verarbeitet...'
    case 'analyzing':
      return 'Inhalte werden analysiert...'
    case 'indexing':
      return 'Vektoren werden erstellt...'
    case 'completed':
      return 'Upload abgeschlossen'
    case 'error':
      return 'Fehler beim Upload'
    case 'cancelled':
      return 'Upload wurde abgebrochen'
    default:
      return 'Unbekannter Status'
  }
} 