interface LanguageScore {
  language: string
  confidence: number
}

interface LanguageFeatures {
  ngrams: Map<string, number>
  wordPatterns: Map<string, number>
  specialChars: Map<string, number>
}

export class LanguageDetector {
  // ISO 639-1 Sprachcodes und ihre Features
  private readonly languageProfiles: Map<string, LanguageFeatures> = new Map([
    ['de', this.getGermanProfile()],
    ['en', this.getEnglishProfile()],
    ['fr', this.getFrenchProfile()],
    ['es', this.getSpanishProfile()],
    ['it', this.getItalianProfile()]
  ])

  /**
   * Erkennt die wahrscheinlichste Sprache eines Textes
   */
  public detectLanguage(text: string): LanguageScore[] {
    const textFeatures = this.extractFeatures(text)
    const scores: LanguageScore[] = []

    for (const [language, profile] of this.languageProfiles) {
      const score = this.calculateLanguageScore(textFeatures, profile)
      scores.push({ language, confidence: score })
    }

    // Sortiere nach Konfidenz absteigend
    return scores.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Extrahiert Features aus einem Text
   */
  private extractFeatures(text: string): LanguageFeatures {
    return {
      ngrams: this.extractNgrams(text),
      wordPatterns: this.extractWordPatterns(text),
      specialChars: this.extractSpecialChars(text)
    }
  }

  /**
   * Extrahiert N-Gramme (2-3 Zeichen) aus einem Text
   */
  private extractNgrams(text: string): Map<string, number> {
    const ngrams = new Map<string, number>()
    const normalizedText = text.toLowerCase()

    // Bi-gramme
    for (let i = 0; i < normalizedText.length - 1; i++) {
      const bigram = normalizedText.slice(i, i + 2)
      ngrams.set(bigram, (ngrams.get(bigram) || 0) + 1)
    }

    // Tri-gramme
    for (let i = 0; i < normalizedText.length - 2; i++) {
      const trigram = normalizedText.slice(i, i + 3)
      ngrams.set(trigram, (ngrams.get(trigram) || 0) + 1)
    }

    return ngrams
  }

  /**
   * Extrahiert Wortmuster aus einem Text
   */
  private extractWordPatterns(text: string): Map<string, number> {
    const patterns = new Map<string, number>()
    const words = text.toLowerCase().split(/\s+/)

    for (const word of words) {
      // Wortendungen
      if (word.length > 2) {
        const ending = word.slice(-2)
        patterns.set(`end:${ending}`, (patterns.get(`end:${ending}`) || 0) + 1)
      }

      // Wortanfänge
      if (word.length > 2) {
        const beginning = word.slice(0, 2)
        patterns.set(`start:${beginning}`, (patterns.get(`start:${beginning}`) || 0) + 1)
      }

      // Vokal/Konsonant-Muster
      const vcPattern = word.replace(/[aeiouäöüáéíóúàèìòù]/gi, 'V').replace(/[^V]/g, 'C')
      patterns.set(`vc:${vcPattern}`, (patterns.get(`vc:${vcPattern}`) || 0) + 1)
    }

    return patterns
  }

  /**
   * Extrahiert spezielle Zeichen und ihre Häufigkeit
   */
  private extractSpecialChars(text: string): Map<string, number> {
    const chars = new Map<string, number>()
    const specialCharsRegex = /[äöüßéèêëàâçñ]/g

    let match
    while ((match = specialCharsRegex.exec(text)) !== null) {
      const char = match[0]
      chars.set(char, (chars.get(char) || 0) + 1)
    }

    return chars
  }

  /**
   * Berechnet die Ähnlichkeit zwischen Text-Features und Sprachprofil
   */
  private calculateLanguageScore(
    textFeatures: LanguageFeatures,
    profileFeatures: LanguageFeatures
  ): number {
    const weights = {
      ngrams: 0.5,
      wordPatterns: 0.3,
      specialChars: 0.2
    }

    const ngramScore = this.calculateFeatureSetSimilarity(
      textFeatures.ngrams,
      profileFeatures.ngrams
    )

    const patternScore = this.calculateFeatureSetSimilarity(
      textFeatures.wordPatterns,
      profileFeatures.wordPatterns
    )

    const charScore = this.calculateFeatureSetSimilarity(
      textFeatures.specialChars,
      profileFeatures.specialChars
    )

    return (
      ngramScore * weights.ngrams +
      patternScore * weights.wordPatterns +
      charScore * weights.specialChars
    )
  }

  /**
   * Berechnet die Ähnlichkeit zwischen zwei Feature-Sets
   */
  private calculateFeatureSetSimilarity(
    set1: Map<string, number>,
    set2: Map<string, number>
  ): number {
    let intersection = 0
    let union = 0

    // Berechne Schnittmenge und Vereinigung
    for (const [feature, count1] of set1) {
      const count2 = set2.get(feature) || 0
      intersection += Math.min(count1, count2)
      union += Math.max(count1, count2)
    }

    // Füge restliche Features aus set2 zur Vereinigung hinzu
    for (const [feature, count2] of set2) {
      if (!set1.has(feature)) {
        union += count2
      }
    }

    return union === 0 ? 0 : intersection / union
  }

  /**
   * Deutsches Sprachprofil
   */
  private getGermanProfile(): LanguageFeatures {
    return {
      ngrams: new Map([
        ['en', 10], ['er', 9], ['ch', 8], ['de', 7], ['ei', 7],
        ['sch', 6], ['die', 5], ['und', 5], ['der', 5]
      ]),
      wordPatterns: new Map([
        ['end:en', 10], ['end:er', 8], ['start:ge', 7],
        ['vc:CVVCV', 6], ['vc:CCVC', 5]
      ]),
      specialChars: new Map([
        ['ä', 5], ['ö', 4], ['ü', 4], ['ß', 3]
      ])
    }
  }

  /**
   * Englisches Sprachprofil
   */
  private getEnglishProfile(): LanguageFeatures {
    return {
      ngrams: new Map([
        ['th', 10], ['he', 9], ['in', 8], ['er', 7], ['an', 7],
        ['the', 6], ['and', 5], ['ing', 5]
      ]),
      wordPatterns: new Map([
        ['end:ing', 10], ['end:ed', 8], ['start:th', 7],
        ['vc:CVC', 6], ['vc:CVCV', 5]
      ]),
      specialChars: new Map()
    }
  }

  /**
   * Französisches Sprachprofil
   */
  private getFrenchProfile(): LanguageFeatures {
    return {
      ngrams: new Map([
        ['le', 10], ['es', 9], ['en', 8], ['de', 7], ['re', 7],
        ['les', 6], ['des', 5], ['ent', 5]
      ]),
      wordPatterns: new Map([
        ['end:er', 10], ['end:ez', 8], ['start:le', 7],
        ['vc:CVCV', 6], ['vc:CV', 5]
      ]),
      specialChars: new Map([
        ['é', 5], ['è', 4], ['ê', 4], ['ë', 3], ['à', 3], ['â', 2], ['ç', 2]
      ])
    }
  }

  /**
   * Spanisches Sprachprofil
   */
  private getSpanishProfile(): LanguageFeatures {
    return {
      ngrams: new Map([
        ['en', 10], ['de', 9], ['es', 8], ['ar', 7], ['la', 7],
        ['que', 6], ['los', 5], ['ión', 5]
      ]),
      wordPatterns: new Map([
        ['end:ar', 10], ['end:os', 8], ['start:el', 7],
        ['vc:CVCV', 6], ['vc:CVCVC', 5]
      ]),
      specialChars: new Map([
        ['á', 5], ['é', 4], ['í', 4], ['ó', 4], ['ú', 3], ['ñ', 3]
      ])
    }
  }

  /**
   * Italienisches Sprachprofil
   */
  private getItalianProfile(): LanguageFeatures {
    return {
      ngrams: new Map([
        ['di', 10], ['re', 9], ['to', 8], ['la', 7], ['il', 7],
        ['che', 6], ['per', 5], ['non', 5]
      ]),
      wordPatterns: new Map([
        ['end:re', 10], ['end:to', 8], ['start:di', 7],
        ['vc:CVCV', 6], ['vc:CVCCV', 5]
      ]),
      specialChars: new Map([
        ['à', 5], ['è', 4], ['ì', 4], ['ò', 3], ['ù', 2]
      ])
    }
  }
} 