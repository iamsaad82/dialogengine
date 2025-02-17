interface FuzzyMatchOptions {
  threshold: number;
  caseSensitive: boolean;
  tokenize: boolean;
  maxDistance: number;
}

interface TokenizedString {
  original: string;
  tokens: string[];
}

export class FuzzyMatcher {
  private readonly defaultOptions: FuzzyMatchOptions = {
    threshold: 0.6,
    caseSensitive: false,
    tokenize: true,
    maxDistance: 3
  };

  constructor(private options: Partial<FuzzyMatchOptions> = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Berechnet die Levenshtein-Distanz zwischen zwei Strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    // Matrix initialisieren
    for (let i = 0; i <= str1.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str2.length; j++) {
      matrix[0][j] = j;
    }

    // Matrix füllen
    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // Löschung
          matrix[i][j - 1] + 1,      // Einfügung
          matrix[i - 1][j - 1] + cost // Ersetzung
        );
      }
    }

    return matrix[str1.length][str2.length];
  }

  /**
   * Berechnet die Ähnlichkeit zwischen zwei Strings (0-1)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (!this.options.caseSensitive) {
      str1 = str1.toLowerCase();
      str2 = str2.toLowerCase();
    }

    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    // Normalisierte Ähnlichkeit (1 = exakte Übereinstimmung)
    return 1 - (distance / maxLength);
  }

  /**
   * Tokenisiert einen String in Wörter
   */
  private tokenize(text: string): TokenizedString {
    const tokens = text
      .split(/\s+/)
      .filter(token => token.length > 0);
    
    return {
      original: text,
      tokens
    };
  }

  /**
   * Findet die beste Übereinstimmung in einer Liste von Strings
   */
  public findBestMatch(query: string, candidates: string[]): {
    bestMatch: string;
    similarity: number;
    index: number;
  } {
    let bestMatch = candidates[0];
    let bestSimilarity = 0;
    let bestIndex = 0;

    if (this.options.tokenize) {
      const queryTokens = this.tokenize(query);
      
      candidates.forEach((candidate, index) => {
        const candidateTokens = this.tokenize(candidate);
        
        // Berechne die durchschnittliche Ähnlichkeit aller Token-Paare
        const similarities = queryTokens.tokens.map(queryToken => 
          Math.max(...candidateTokens.tokens.map(candidateToken =>
            this.calculateSimilarity(queryToken, candidateToken)
          ))
        );
        
        const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
        
        if (avgSimilarity > bestSimilarity) {
          bestMatch = candidate;
          bestSimilarity = avgSimilarity;
          bestIndex = index;
        }
      });
    } else {
      candidates.forEach((candidate, index) => {
        const similarity = this.calculateSimilarity(query, candidate);
        if (similarity > bestSimilarity) {
          bestMatch = candidate;
          bestSimilarity = similarity;
          bestIndex = index;
        }
      });
    }

    return {
      bestMatch,
      similarity: bestSimilarity,
      index: bestIndex
    };
  }

  /**
   * Findet alle Übereinstimmungen über dem Schwellenwert
   */
  public findMatches(query: string, candidates: string[]): Array<{
    text: string;
    similarity: number;
    index: number;
  }> {
    return candidates
      .map((candidate, index) => ({
        text: candidate,
        similarity: this.options.tokenize
          ? this.calculateTokenizedSimilarity(query, candidate)
          : this.calculateSimilarity(query, candidate),
        index
      }))
      .filter(match => match.similarity >= this.options.threshold)
      .sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Berechnet die Ähnlichkeit zwischen tokenisierten Strings
   */
  private calculateTokenizedSimilarity(str1: string, str2: string): number {
    const tokens1 = this.tokenize(str1);
    const tokens2 = this.tokenize(str2);

    const similarities = tokens1.tokens.map(token1 =>
      Math.max(...tokens2.tokens.map(token2 =>
        this.calculateSimilarity(token1, token2)
      ))
    );

    return similarities.reduce((a, b) => a + b, 0) / similarities.length;
  }
} 