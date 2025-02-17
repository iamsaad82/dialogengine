import { ContentType, ContentTypeEnum, CONTENT_TYPES } from '../types/contentTypes'
import { OpenAI } from 'openai'
import { ProcessedDocument } from './document/types'
import { createHash } from 'crypto'

export interface DetectionInput {
  text: string
  title: string
  url: string
}

export interface DetectionResult {
  type: ContentType
  confidence: number
}

export interface ExtendedDetectionResult extends DetectionResult {
  suggestedMetadata: Record<string, unknown>
}

interface CacheEntry {
  timestamp: number
  result: ExtendedDetectionResult
}

export class ContentTypeDetector {
  private openai: OpenAI
  private lastDetectedType: ContentType | null = null
  private cache: Map<string, CacheEntry> = new Map()
  private readonly CACHE_TTL = 1000 * 60 * 60 // 1 Stunde
  private readonly typePatterns: Record<ContentType, RegExp[]> = {
    'medical': [
      /(?:arzt|medizin|gesundheit|krankheit|diagnose|therapie|behandlung)/i,
      /(?:praxis|klinik|krankenhaus|ambulanz|notfall)/i,
      /(?:patient|symptom|medikament|rezept|überweisung)/i
    ],
    'insurance': [
      /(?:versicherung|police|tarif|beitrag|leistung)/i,
      /(?:schaden|erstattung|antrag|versichert|schutz)/i,
      /(?:prämie|vertrag|bedingung|klausel|deckung)/i
    ],
    'city-administration': [
      /(?:bürgeramt|stadtamt|verwaltung|behörde|amt)/i,
      /(?:antrag|formular|dokument|ausweis|pass)/i,
      /(?:termin|öffnungszeit|sprechstunde|beratung)/i
    ],
    'shopping-center': [
      /(?:shopping|einkauf|geschäft|laden|center)/i,
      /(?:produkt|angebot|preis|rabatt|aktion)/i,
      /(?:öffnungszeit|parkplatz|service|beratung)/i
    ],
    'default': [
      /(?:information|hilfe|kontakt|faq|support)/i
    ]
  }

  constructor(openai: OpenAI) {
    this.openai = openai
  }

  private getCacheKey(content: string): string {
    return createHash('md5').update(content).digest('hex')
  }

  private isCacheValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.CACHE_TTL
  }

  async detect(input: ProcessedDocument | string): Promise<ExtendedDetectionResult> {
    try {
      const content = typeof input === 'string' ? input : input.content
      const cacheKey = this.getCacheKey(content)
      
      // Prüfe Cache
      const cachedResult = this.cache.get(cacheKey)
      if (cachedResult && this.isCacheValid(cachedResult)) {
        console.log('[ContentTypeDetector] Cache-Treffer für Content-Type')
        this.lastDetectedType = cachedResult.result.type
        return cachedResult.result
      }
      
      // Extrahiere repräsentativen Ausschnitt
      const sample = this.extractRepresentativeSample(content)
      
      // Regelbasierte Voranalyse
      const ruleBasedResult = this.analyzeWithRules(sample)
      
      // KI-basierte Analyse nur wenn nötig
      let result: ExtendedDetectionResult
      if (ruleBasedResult.confidence > 0.8) {
        console.log('[ContentTypeDetector] Verwende regelbasiertes Ergebnis')
        result = {
          ...ruleBasedResult,
          suggestedMetadata: await this.extractMetadata(sample, ruleBasedResult.type)
        }
      } else {
        console.log('[ContentTypeDetector] Führe KI-Analyse durch')
        result = await this.analyzeWithAI(sample)
      }
      
      // Cache aktualisieren
      this.cache.set(cacheKey, {
        timestamp: Date.now(),
        result
      })
      
      this.lastDetectedType = result.type
      return result
    } catch (error) {
      console.error('[ContentTypeDetector] Fehler bei der Erkennung:', error)
      throw error
    }
  }

  private extractRepresentativeSample(content: string): string {
    // Für XML-Dokumente
    if (content.trim().startsWith('<?xml')) {
      return this.extractXmlSample(content)
    }
    
    // Für normalen Text
    return this.extractTextSample(content)
  }

  private extractXmlSample(content: string): string {
    try {
      // Extrahiere Root-Element und erste relevante Kinder
      const matches = content.match(/<([^?].*?)>[\s\S]{0,3000}<\/\1>/)
      if (matches) {
        return matches[0]
      }
    } catch (error) {
      console.warn('[ContentTypeDetector] Fehler beim XML-Sampling:', error)
    }
    
    // Fallback: Nimm die ersten 3000 Zeichen
    return content.slice(0, 3000)
  }

  private extractTextSample(content: string): string {
    // Extrahiere erste 3000 Zeichen, aber beende am letzten vollständigen Satz
    const sample = content.slice(0, 3000)
    const lastSentence = sample.match(/^[\s\S]*[.!?]/)
    return lastSentence ? lastSentence[0] : sample
  }

  private analyzeWithRules(content: string): DetectionResult {
    const scores: Record<ContentType, number> = {
      'medical': 0,
      'insurance': 0,
      'city-administration': 0,
      'shopping-center': 0,
      'default': 0
    }

    // Berechne Scores für jeden Typ
    for (const [type, patterns] of Object.entries(this.typePatterns)) {
      const typeScore = patterns.reduce((score, pattern) => {
        const matches = content.match(pattern) || []
        return score + matches.length
      }, 0)
      scores[type as ContentType] = typeScore
    }

    // Finde den Typ mit dem höchsten Score
    const entries = Object.entries(scores)
    const [bestType, bestScore] = entries.reduce((max, current) => 
      current[1] > max[1] ? current : max
    )

    // Berechne Konfidenz
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0)
    const confidence = totalScore > 0 ? bestScore / totalScore : 0

    return {
      type: bestType as ContentType,
      confidence
    }
  }

  private async analyzeWithAI(content: string): Promise<ExtendedDetectionResult> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `Analysiere den folgenden Text und bestimme den Content-Type.
            Mögliche Typen sind: ${Object.values(ContentTypeEnum).join(', ')}.
            Berücksichtige dabei:
            1. Fachspezifische Begriffe und Terminologie
            2. Kontext und Thematik
            3. Strukturelle Merkmale
            4. Zielgruppe und Intention
            
            Antworte im JSON-Format mit:
            {
              "type": string,
              "confidence": number,
              "explanation": string,
              "suggestedMetadata": object
            }`
          },
          {
            role: 'user',
            content
          }
        ],
        response_format: { type: 'json_object' }
      })

      if (!response.choices[0].message.content) {
        throw new Error('Keine Antwort von OpenAI erhalten')
      }

      const result = JSON.parse(response.choices[0].message.content)
      return {
        type: result.type as ContentType,
        confidence: result.confidence,
        suggestedMetadata: result.suggestedMetadata
      }
    } catch (error) {
      console.error('[ContentTypeDetector] Fehler bei der Content-Analyse:', error)
      throw error
    }
  }

  private async extractMetadata(content: string, type: ContentType): Promise<Record<string, unknown>> {
    // Extrahiere typ-spezifische Metadaten
    const metadata: Record<string, unknown> = {}
    
    switch (type) {
      case 'medical':
        metadata.specialties = this.extractMedicalSpecialties(content)
        metadata.conditions = this.extractMedicalConditions(content)
        metadata.treatments = this.extractTreatments(content)
        break
      
      case 'insurance':
        metadata.insuranceTypes = this.extractInsuranceTypes(content)
        metadata.coverage = this.extractCoverage(content)
        metadata.terms = this.extractTerms(content)
        break
      
      case 'city-administration':
        metadata.services = this.extractAdministrativeServices(content)
        metadata.requirements = this.extractRequirements(content)
        metadata.deadlines = this.extractDeadlines(content)
        break
      
      case 'shopping-center':
        metadata.categories = this.extractShoppingCategories(content)
        metadata.offers = this.extractOffers(content)
        metadata.locations = this.extractLocations(content)
        break
    }
    
    return metadata
  }

  private extractMedicalSpecialties(content: string): string[] {
    const specialties = new Set<string>()
    const patterns = [
      /(?:facharzt|spezialist)\s+für\s+([^.,:]+)/gi,
      /(?:allgemeinmedizin|innere medizin|chirurgie|orthopädie|gynäkologie|dermatologie|neurologie|psychiatrie|urologie|pädiatrie)/gi
    ]
    
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          specialties.add(match[1].trim().toLowerCase())
        } else if (match[0]) {
          specialties.add(match[0].trim().toLowerCase())
        }
      }
    }
    
    return Array.from(specialties)
  }

  private extractMedicalConditions(content: string): string[] {
    const conditions = new Set<string>()
    const patterns = [
      /(?:krankheit|erkrankung|diagnose|syndrom|störung):\s*([^.,:]+)/gi,
      /(?:symptome|beschwerden|anzeichen):\s*([^.,:]+)/gi
    ]
    
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          conditions.add(match[1].trim().toLowerCase())
        }
      }
    }
    
    return Array.from(conditions)
  }

  private extractTreatments(content: string): string[] {
    const treatments = new Set<string>()
    const patterns = [
      /(?:behandlung|therapie|maßnahme):\s*([^.,:]+)/gi,
      /(?:medikament|arznei|präparat):\s*([^.,:]+)/gi
    ]
    
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          treatments.add(match[1].trim().toLowerCase())
        }
      }
    }
    
    return Array.from(treatments)
  }

  private extractInsuranceTypes(content: string): string[] {
    const types = new Set<string>()
    const patterns = [
      /(?:versicherungsart|versicherungstyp|tarif):\s*([^.,:]+)/gi,
      /(?:krankenversicherung|pflegeversicherung|unfallversicherung|lebensversicherung)/gi
    ]
    
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          types.add(match[1].trim().toLowerCase())
        } else if (match[0]) {
          types.add(match[0].trim().toLowerCase())
        }
      }
    }
    
    return Array.from(types)
  }

  private extractCoverage(content: string): string[] {
    const coverage = new Set<string>()
    const patterns = [
      /(?:leistung|erstattung|abdeckung):\s*([^.,:]+)/gi,
      /(?:versicherungsschutz|versicherungsumfang):\s*([^.,:]+)/gi
    ]
    
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          coverage.add(match[1].trim().toLowerCase())
        }
      }
    }
    
    return Array.from(coverage)
  }

  private extractTerms(content: string): string[] {
    const terms = new Set<string>()
    const patterns = [
      /(?:bedingung|klausel|vereinbarung):\s*([^.,:]+)/gi,
      /(?:laufzeit|kündigungsfrist|mindestvertragsdauer):\s*([^.,:]+)/gi
    ]
    
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          terms.add(match[1].trim().toLowerCase())
        }
      }
    }
    
    return Array.from(terms)
  }

  private extractAdministrativeServices(content: string): string[] {
    const services = new Set<string>()
    const patterns = [
      /(?:dienstleistung|service|angebot):\s*([^.,:]+)/gi,
      /(?:ausweis|pass|dokument|bescheinigung|genehmigung)/gi
    ]
    
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          services.add(match[1].trim().toLowerCase())
        } else if (match[0]) {
          services.add(match[0].trim().toLowerCase())
        }
      }
    }
    
    return Array.from(services)
  }

  private extractRequirements(content: string): string[] {
    const requirements = new Set<string>()
    const patterns = [
      /(?:voraussetzung|anforderung|erforderlich):\s*([^.,:]+)/gi,
      /(?:benötigt|mitzubringen|vorzulegen):\s*([^.,:]+)/gi
    ]
    
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          requirements.add(match[1].trim().toLowerCase())
        }
      }
    }
    
    return Array.from(requirements)
  }

  private extractDeadlines(content: string): string[] {
    const deadlines = new Set<string>()
    const patterns = [
      /(?:frist|termin|deadline):\s*([^.,:]+)/gi,
      /(?:bis zum|spätestens|gültig bis):\s*([^.,:]+)/gi
    ]
    
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          deadlines.add(match[1].trim().toLowerCase())
        }
      }
    }
    
    return Array.from(deadlines)
  }

  private extractShoppingCategories(content: string): string[] {
    const categories = new Set<string>()
    const patterns = [
      /(?:kategorie|abteilung|bereich):\s*([^.,:]+)/gi,
      /(?:mode|elektronik|lebensmittel|möbel|sport|beauty)/gi
    ]
    
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          categories.add(match[1].trim().toLowerCase())
        } else if (match[0]) {
          categories.add(match[0].trim().toLowerCase())
        }
      }
    }
    
    return Array.from(categories)
  }

  private extractOffers(content: string): string[] {
    const offers = new Set<string>()
    const patterns = [
      /(?:angebot|aktion|rabatt):\s*([^.,:]+)/gi,
      /(?:sonderpreis|sale|reduziert):\s*([^.,:]+)/gi
    ]
    
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          offers.add(match[1].trim().toLowerCase())
        }
      }
    }
    
    return Array.from(offers)
  }

  private extractLocations(content: string): string[] {
    const locations = new Set<string>()
    const patterns = [
      /(?:standort|filiale|geschäft):\s*([^.,:]+)/gi,
      /(?:adresse|anschrift):\s*([^.,:]+)/gi
    ]
    
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          locations.add(match[1].trim().toLowerCase())
        }
      }
    }
    
    return Array.from(locations)
  }

  public getLastDetectedType(): ContentType | null {
    return this.lastDetectedType
  }

  async detectWithAI(input: DetectionInput): Promise<DetectionResult> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Du bist ein Content-Type-Detector. Analysiere den gegebenen Text und Titel, um den passenden Content-Type zu bestimmen. 
                     Mögliche Typen sind: ${Object.values(ContentTypeEnum).join(', ')}`
          },
          {
            role: 'user',
            content: `Text: ${input.text}\nTitel: ${input.title}\nURL: ${input.url}`
          }
        ],
        temperature: 0.3
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        return {
          type: ContentTypeEnum.DEFAULT,
          confidence: 0
        }
      }

      const result = JSON.parse(content) as DetectionResult

      // Validiere den zurückgegebenen Typ
      if (!Object.values(ContentTypeEnum).includes(result.type)) {
        return {
          type: ContentTypeEnum.DEFAULT,
          confidence: 0
        }
      }

      return result
    } catch (error) {
      console.error('Fehler bei der Content-Type-Erkennung:', error)
      return {
        type: ContentTypeEnum.DEFAULT,
        confidence: 0
      }
    }
  }

  async detectBatch(inputs: DetectionInput[]): Promise<DetectionResult[]> {
    const promises = inputs.map(input => this.detectWithAI(input))
    return Promise.all(promises)
  }

  private matchesType(document: ProcessedDocument, type: ContentType): boolean {
    const content = document.content.toLowerCase();
    const title = document.metadata.title?.toLowerCase() || '';

    switch (type) {
      case ContentTypeEnum.CITY_ADMINISTRATION:
        return content.includes('bürgeramt') || 
               content.includes('stadtamt') || 
               content.includes('verwaltung');
      
      case ContentTypeEnum.MEDICAL:
        return content.includes('arzt') || 
               content.includes('medizin') || 
               content.includes('gesundheit');
      
      case ContentTypeEnum.INSURANCE:
        return content.includes('versicherung') || 
               content.includes('police') || 
               content.includes('tarif');
      
      case ContentTypeEnum.SHOPPING_CENTER:
        return content.includes('shopping') || 
               content.includes('einkauf') || 
               content.includes('geschäft');
      
      default:
        return false;
    }
  }
} 