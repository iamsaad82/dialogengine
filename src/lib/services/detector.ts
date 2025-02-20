import { OpenAI } from 'openai'
import { 
  BaseContentType,
  DomainContentType,
  AOKContentType,
  ContentType,
  isValidContentType 
} from '@/lib/types/contentTypes'
import type { ProcessedDocument } from '@/lib/services/document/types'
import type { StructuralElement } from '@/lib/types/structural'
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
  private cache: Map<string, CacheEntry>
  private lastDetectedType: ContentType | null
  private readonly CACHE_TTL = 1000 * 60 * 60 // 1 Stunde
  
  private typePatterns: Record<DomainContentType | AOKContentType, RegExp[]> = {
    [DomainContentType.MEDICAL]: [
      /(?:arzt|medizin|gesundheit|behandlung|therapie|diagnose)/i,
      /(?:krankheit|symptome|patient|praxis|klinik)/i
    ],
    [DomainContentType.INSURANCE]: [
      /(?:versicherung|police|tarif|beitrag|leistung)/i,
      /(?:schaden|antrag|erstattung|versichert)/i
    ],
    [DomainContentType.CITY_ADMINISTRATION]: [
      /(?:bürgeramt|stadtamt|verwaltung|behörde)/i,
      /(?:ausweis|pass|dokument|bescheinigung|genehmigung)/i
    ],
    [DomainContentType.SHOPPING_CENTER]: [
      /(?:shopping|einkauf|geschäft|laden|markt)/i,
      /(?:produkt|angebot|preis|rabatt|verkauf)/i
    ],
    [DomainContentType.DEFAULT]: [
      /(?:information|übersicht|details|allgemein)/i
    ],
    [AOKContentType.MEDICAL]: [
      /(?:aok.*medizin|behandlung.*aok|aok.*gesundheit)/i
    ],
    [AOKContentType.PREVENTION]: [
      /(?:vorsorge|prävention|gesundheitskurs|früherkennung)/i
    ],
    [AOKContentType.INSURANCE]: [
      /(?:aok.*versicherung|versicherungsschutz|leistungsanspruch)/i
    ],
    [AOKContentType.SERVICE]: [
      /(?:service|beratung|kundenservice|geschäftsstelle)/i
    ],
    [AOKContentType.BONUS]: [
      /(?:bonus|prämie|vorteil|gesundheitskonto)/i
    ],
    [AOKContentType.CURAPLAN]: [
      /(?:curaplan|chronisch|dmp|behandlungsprogramm)/i
    ],
    [AOKContentType.FAMILY]: [
      /(?:familie|kind|schwangerschaft|eltern)/i
    ],
    [AOKContentType.DIGITAL]: [
      /(?:online|app|digital|elektronisch)/i
    ],
    [AOKContentType.EMERGENCY]: [
      /(?:notfall|akut|bereitschaft|notruf)/i
    ],
    [AOKContentType.CONTACT]: [
      /(?:kontakt|ansprechpartner|hotline|support)/i
    ]
  }

  constructor(openai: OpenAI) {
    this.openai = openai
    this.cache = new Map()
    this.lastDetectedType = null
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
    // Entferne Whitespace und HTML-Tags
    const cleanContent = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    
    // Nimm die ersten 3000 Zeichen
    return cleanContent.slice(0, 3000)
  }

  private analyzeWithRules(content: string): DetectionResult {
    const scores: Record<ContentType, number> = {
      // Base types
      [BaseContentType.INFO]: 0,
      [BaseContentType.WARNING]: 0,
      [BaseContentType.ERROR]: 0,
      [BaseContentType.SUCCESS]: 0,

      // Domain types
      [DomainContentType.MEDICAL]: 0,
      [DomainContentType.INSURANCE]: 0,
      [DomainContentType.CITY_ADMINISTRATION]: 0,
      [DomainContentType.SHOPPING_CENTER]: 0,
      [DomainContentType.DEFAULT]: 0,

      // AOK types
      [AOKContentType.MEDICAL]: 0,
      [AOKContentType.PREVENTION]: 0,
      [AOKContentType.INSURANCE]: 0,
      [AOKContentType.SERVICE]: 0,
      [AOKContentType.BONUS]: 0,
      [AOKContentType.CURAPLAN]: 0,
      [AOKContentType.FAMILY]: 0,
      [AOKContentType.DIGITAL]: 0,
      [AOKContentType.EMERGENCY]: 0,
      [AOKContentType.CONTACT]: 0
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
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'Analysiere den folgenden Text und bestimme den Content-Type. ' +
              'Mögliche Typen sind: medical, insurance, city-administration, shopping-center, default. ' +
              'Gib das Ergebnis als JSON mit type, confidence und suggestedMetadata zurück.'
          },
          {
            role: 'user',
            content: content
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })

      const response = completion.choices[0].message.content
      if (!response) {
        throw new Error('Keine Antwort von OpenAI erhalten')
      }

      const result = JSON.parse(response) as ExtendedDetectionResult
      return {
        type: result.type as ContentType,
        confidence: result.confidence || 1.0,
        suggestedMetadata: result.suggestedMetadata || {}
      }
    } catch (error) {
      console.error('Fehler bei der Content-Type-Erkennung:', error)
      return {
        type: DomainContentType.DEFAULT,
        confidence: 0.5,
        suggestedMetadata: {}
      }
    }
  }

  private async extractMetadata(content: string, type: ContentType): Promise<Record<string, unknown>> {
    // Extrahiere spezifische Metadaten basierend auf dem Content-Type
    switch (type) {
      case DomainContentType.MEDICAL:
        return {
          specialties: this.extractMedicalSpecialties(content),
          treatments: this.extractTreatments(content)
        }
      case DomainContentType.INSURANCE:
        return {
          insuranceTypes: this.extractInsuranceTypes(content),
          coverages: this.extractCoverages(content)
        }
      case DomainContentType.CITY_ADMINISTRATION:
        return {
          services: this.extractAdministrativeServices(content),
          requirements: this.extractRequirements(content)
        }
      case DomainContentType.SHOPPING_CENTER:
        return {
          categories: this.extractShoppingCategories(content),
          openingHours: this.extractOpeningHours(content)
        }
      default:
        return {}
    }
  }

  private extractMedicalSpecialties(content: string): string[] {
    const specialties = new Set<string>()
    const patterns = [
      /(?:facharzt|spezialist|praxis) für\s+([^.,:]+)/gi,
      /(?:allgemeinmedizin|innere|chirurgie|orthopädie)/gi
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

  private extractTreatments(content: string): string[] {
    const treatments = new Set<string>()
    const patterns = [
      /(?:behandlung|therapie):\s*([^.,:]+)/gi,
      /(?:operation|untersuchung|vorsorge)/gi
    ]
    
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          treatments.add(match[1].trim().toLowerCase())
        } else if (match[0]) {
          treatments.add(match[0].trim().toLowerCase())
        }
      }
    }
    
    return Array.from(treatments)
  }

  private extractInsuranceTypes(content: string): string[] {
    const types = new Set<string>()
    const patterns = [
      /(?:versicherung|police|tarif):\s*([^.,:]+)/gi,
      /(?:kranken|leben|haftpflicht|unfall)/gi
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

  private extractCoverages(content: string): string[] {
    const coverages = new Set<string>()
    const patterns = [
      /(?:leistung|abdeckung|schutz):\s*([^.,:]+)/gi,
      /(?:erstattung|schaden|summe)/gi
    ]
    
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          coverages.add(match[1].trim().toLowerCase())
        } else if (match[0]) {
          coverages.add(match[0].trim().toLowerCase())
        }
      }
    }
    
    return Array.from(coverages)
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
      /(?:voraussetzung|erforderlich|benötigt):\s*([^.,:]+)/gi,
      /(?:mitbringen|vorlegen|nachweisen)/gi
    ]
    
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          requirements.add(match[1].trim().toLowerCase())
        } else if (match[0]) {
          requirements.add(match[0].trim().toLowerCase())
        }
      }
    }
    
    return Array.from(requirements)
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

  private extractOpeningHours(content: string): string[] {
    const hours = new Set<string>()
    const patterns = [
      /(?:öffnungszeiten|geöffnet):\s*([^.,:]+)/gi,
      /(?:montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)[\s-]*\d{1,2}[:.]\d{2}/gi
    ]
    
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          hours.add(match[1].trim().toLowerCase())
        } else if (match[0]) {
          hours.add(match[0].trim().toLowerCase())
        }
      }
    }
    
    return Array.from(hours)
  }

  public getLastDetectedType(): ContentType | null {
    return this.lastDetectedType
  }
} 