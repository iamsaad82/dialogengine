import { OpenAI } from 'openai';
import { ProcessedDocument } from '../../../document/types';
import { MonitoringService } from '../../../../monitoring/monitoring';

export class AOKFactExtractor {
  private openai: OpenAI;
  private monitoring: MonitoringService;

  constructor(openaiApiKey: string, monitoring: MonitoringService) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.monitoring = monitoring;
  }

  async extractFacts(document: ProcessedDocument, type: 'standard' | 'detailed' | 'contact'): Promise<string[]> {
    try {
      console.log(`[AOKFactExtractor] Extrahiere Fakten vom Typ ${type}`);
      
      switch (type) {
        case 'standard':
          return this.extractStandardFacts(document);
        case 'detailed':
          return this.extractDetailedFacts(document);
        case 'contact':
          return this.extractContactFacts(document);
        default:
          throw new Error(`Unbekannter Faktentyp: ${type}`);
      }
    } catch (error) {
      console.error(`[AOKFactExtractor] Fehler bei der Faktenextraktion:`, error);
      this.monitoring.recordError('fact_extraction', error instanceof Error ? error.message : 'Unbekannter Fehler');
      return [];
    }
  }

  private async extractStandardFacts(document: ProcessedDocument): Promise<string[]> {
    const prompt = `Extrahiere die 3-5 wichtigsten Kernfakten aus dem Text.
                   Fokussiere auf:
                   - Art der Leistung
                   - Hauptvorteile
                   - Wichtigste Voraussetzungen
                   Formuliere kurze, prägnante Aussagen.`;

    return this.extractFactsWithAI(document.content, prompt);
  }

  private async extractDetailedFacts(document: ProcessedDocument): Promise<string[]> {
    const prompt = `Extrahiere 5-7 detaillierte Fakten aus dem Text.
                   Berücksichtige:
                   - Spezifische Leistungsdetails
                   - Besondere Bedingungen
                   - Kosten und Erstattungen
                   - Zeitliche Aspekte
                   - Besondere Merkmale
                   Gib die Informationen in verständlichen Sätzen wieder.`;

    return this.extractFactsWithAI(document.content, prompt);
  }

  private async extractContactFacts(document: ProcessedDocument): Promise<string[]> {
    // Zuerst versuche regex-basierte Extraktion
    const facts = this.extractContactFactsWithRegex(document.content);
    
    if (facts.length === 0) {
      // Fallback auf KI-basierte Extraktion
      const prompt = `Extrahiere alle Kontaktinformationen aus dem Text.
                     Suche nach:
                     - Telefonnummern
                     - E-Mail-Adressen
                     - Sprechzeiten
                     - Adressen
                     - Ansprechpartner
                     Formuliere die Informationen in klaren, strukturierten Sätzen.`;
      
      return this.extractFactsWithAI(document.content, prompt);
    }
    
    return facts;
  }

  private extractContactFactsWithRegex(content: string): string[] {
    const facts: string[] = [];
    
    // Telefonnummern
    const phonePattern = /Tel(?:efon)?:\s*([\d\s-+()]+)/gi;
    const phoneMatches = content.match(phonePattern);
    if (phoneMatches) {
      facts.push(...phoneMatches.map(match => match.trim()));
    }
    
    // E-Mail
    const emailPattern = /E-Mail:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    const emailMatches = content.match(emailPattern);
    if (emailMatches) {
      facts.push(...emailMatches.map(match => match.trim()));
    }
    
    // Sprechzeiten
    const hoursPattern = /Sprechzeiten:\s*([^\n]+)/gi;
    const hoursMatches = content.match(hoursPattern);
    if (hoursMatches) {
      facts.push(...hoursMatches.map(match => match.trim()));
    }
    
    // Adressen
    const addressPattern = /Adresse:\s*([^\n]+(?:\n[^:\n]+)*)/gi;
    const addressMatches = content.match(addressPattern);
    if (addressMatches) {
      facts.push(...addressMatches.map(match => match.trim().replace(/\n/g, ', ')));
    }
    
    return facts;
  }

  private async extractFactsWithAI(content: string, prompt: string): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content
          }
        ],
        temperature: 0.3,
        max_tokens: 150
      });

      if (!response.choices[0].message.content) {
        throw new Error('Keine Antwort von OpenAI erhalten');
      }

      return response.choices[0].message.content
        .split('\n')
        .map(fact => fact.trim())
        .filter(fact => fact.length > 0)
        .map(fact => fact.replace(/^[•-]\s*/, '')); // Entferne Aufzählungszeichen
    } catch (error) {
      console.error('[AOKFactExtractor] Fehler bei der KI-Extraktion:', error);
      return [];
    }
  }
} 