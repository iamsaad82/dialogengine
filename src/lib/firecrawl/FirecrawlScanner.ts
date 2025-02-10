import Redis from 'ioredis';
import { ContentVectorizer } from '../services/vectorizer';
import { getRedisClient } from '../redis';

interface JobStatus {
  status: string;
  data: any[];
  completed: number;
  total: number;
}

export class FirecrawlScanner {
  private embedder: any;
  private pinecone: any;
  private redis: Redis;
  private vectorizer: ContentVectorizer;

  constructor(
    embedder: any,
    pinecone: any,
    vectorizer: ContentVectorizer
  ) {
    this.embedder = embedder;
    this.pinecone = pinecone;
    this.redis = getRedisClient();
    this.vectorizer = vectorizer;
  }

  private determineContentType(url: string, title: string): string {
    try {
      const parsedUrl = new URL(url);
      const path = parsedUrl.pathname.toLowerCase();
      const lowerTitle = title.toLowerCase();

      // Prüfe URL-Pfade
      if (path.includes('/karriere') || path.includes('/jobs') || path.includes('/stellenangebote')) {
        return 'Stellenangebot';
      }
      if (path.includes('/team') || path.includes('/ueber-uns/team') || path.includes('/about/team')) {
        return 'Team-Mitglied';
      }
      if (path.includes('/news') || path.includes('/aktuelles') || path.includes('/blog')) {
        return 'Neuigkeit';
      }
      if (path.includes('/center') || path.includes('/shopping')) {
        return 'Shopping-Center';
      }
      if (path.includes('/service') || path.includes('/dienstleistungen')) {
        return 'Dienstleistung';
      }
      if (path.includes('/nachhaltigkeit') || path.includes('/sustainability')) {
        return 'Nachhaltigkeit';
      }
      if (path.includes('/kunst') || path.includes('/kultur')) {
        return 'Kunst & Kultur';
      }
      if (path.includes('/impressum') || path.includes('/datenschutz') || path.includes('/agb')) {
        return 'Rechtliches';
      }

      // Prüfe Titel-Keywords
      if (lowerTitle.includes('stellenangebot') || lowerTitle.includes('job') || lowerTitle.includes('karriere')) {
        return 'Stellenangebot';
      }
      if (lowerTitle.includes('team') || lowerTitle.includes('mitarbeiter')) {
        return 'Team-Mitglied';
      }
      if (lowerTitle.includes('news') || lowerTitle.includes('aktuell')) {
        return 'Neuigkeit';
      }
      if (lowerTitle.includes('center') || lowerTitle.includes('shopping')) {
        return 'Shopping-Center';
      }
      if (lowerTitle.includes('service') || lowerTitle.includes('dienstleistung')) {
        return 'Dienstleistung';
      }
      if (lowerTitle.includes('nachhaltig') || lowerTitle.includes('sustainability')) {
        return 'Nachhaltigkeit';
      }
      if (lowerTitle.includes('kunst') || lowerTitle.includes('kultur')) {
        return 'Kunst & Kultur';
      }

      // Fallback für unbekannte Inhaltstypen
      return 'Allgemein';
    } catch (error) {
      console.warn('Fehler bei der Content-Type-Bestimmung:', error);
      return 'Allgemein';
    }
  }

  private async saveToVectorStore(jobId: string, url: string, title: string, text: string, metadata: any = {}) {
    const contentType = this.determineContentType(url, title);
    
    const vectorData = {
      id: jobId + '_' + url,
      values: await this.embedder.embedText(text),
      metadata: {
        ...metadata,
        url,
        title,
        contentType,
        text
      }
    };

    await this.pinecone.upsert({
      vectors: [vectorData]
    });
  }

  private async checkJobStatus(jobId: string): Promise<JobStatus> {
    const status = await this.redis.get(`scan:${jobId}:status`);
    const data = await this.redis.get(`scan:${jobId}:data`);
    const completed = await this.redis.get(`scan:${jobId}:completed`);
    const total = await this.redis.get(`scan:${jobId}:total`);

    return {
      status: status || 'pending',
      data: data ? JSON.parse(data) : [],
      completed: parseInt(completed || '0'),
      total: parseInt(total || '0')
    };
  }

  private async waitForJobCompletion(jobId: string): Promise<void> {
    console.log(`Warte auf Abschluss des Jobs ${jobId}...`);
    let attempts = 0;
    const maxAttempts = 30;
    let waitTime = 3000;

    while (attempts < maxAttempts) {
      attempts++;
      const status = await this.checkJobStatus(jobId);
      
      console.log(`Job Status: ${status.status} (${status.completed}/${status.total}) (Versuch ${attempts}/${maxAttempts})`);

      if (status.status === 'completed') {
        if (status.data && status.data.length > 0) {
          console.log(`Verarbeite ${status.data.length} gefundene Seiten...`);
          let successCount = 0;
          let errorCount = 0;

          // Hole die Template-ID aus Redis
          const templateId = await this.redis.get(`scan:${jobId}:templateId`) || undefined;
          if (!templateId) {
            console.warn('Keine Template-ID gefunden für Job:', jobId);
          }

          for (const item of status.data) {
            if (item.markdown && item.metadata) {
              try {
                const contentType = this.determineContentType(item.metadata.url, item.metadata.title);
                await this.vectorizer.indexContent([{
                  url: item.metadata.url,
                  title: item.metadata.title,
                  content: item.markdown,
                  metadata: {
                    templateId,
                    contentType
                  }
                }]);
                successCount++;
                console.log(`Seite erfolgreich indexiert: ${item.metadata.url}`);
              } catch (error) {
                errorCount++;
                console.error(`Fehler beim Indexieren von ${item.metadata.url}:`, error);
              }
            }
          }

          console.log(`Indexierung abgeschlossen: ${successCount} erfolgreich, ${errorCount} fehlgeschlagen`);
        } else {
          console.warn('Keine Seiten im Scan-Ergebnis gefunden');
        }
        return;
      }

      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    throw new Error(`Job ${jobId} wurde nicht rechtzeitig abgeschlossen`);
  }
} 