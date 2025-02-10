class FirecrawlScanner {
  private embedder: any;
  private pinecone: any;
  private redis: any;

  constructor(embedder: any, pinecone: any, redis: any) {
    this.embedder = embedder;
    this.pinecone = pinecone;
    this.redis = redis;
  }

  private determineContentType(url: string, title: string): string {
    const path = new URL(url).pathname.toLowerCase();
    const titleLower = title.toLowerCase();

    // Spezifische URL-Pfad-Prüfungen
    if (path.includes('/jobs/')) return 'Stellenangebot';
    if (path.includes('/team/')) return 'Team-Mitglied';
    if (path.includes('/news/') || path.includes('/aktuelles/')) return 'Neuigkeit';
    if (path.includes('/center/') || path.includes('-center')) return 'Shopping-Center';
    if (path.includes('/property-management/')) return 'Dienstleistung';
    if (path.includes('/esg/')) return 'Nachhaltigkeit';
    if (path.includes('/kunst/')) return 'Kunst & Kultur';
    if (path.includes('/impressum/')) return 'Rechtliches';

    // Titel-basierte Prüfungen
    if (titleLower.includes('center') || titleLower.includes('park')) return 'Shopping-Center';
    if (titleLower.includes('job') || titleLower.includes('stelle') || titleLower.includes('karriere')) return 'Stellenangebot';
    if (titleLower.includes('kontakt') || titleLower.includes('impressum')) return 'Rechtliches';
    if (titleLower.includes('news') || titleLower.includes('aktuell')) return 'Neuigkeit';
    if (titleLower.includes('kunst') || titleLower.includes('kultur')) return 'Kunst & Kultur';
    if (titleLower.includes('team') || titleLower.includes('über uns')) return 'Team-Mitglied';
    if (titleLower.includes('esg') || titleLower.includes('nachhaltigkeit')) return 'Nachhaltigkeit';
    if (titleLower.includes('service') || titleLower.includes('dienstleistung')) return 'Dienstleistung';

    // Fallback für unbekannte Inhaltstypen
    return 'Allgemein';
  }

  private async saveToVectorStore(url: string, title: string, content: string, templateId: string) {
    const contentType = this.determineContentType(url, title);
    const embedding = await this.embedder.embed(content);
    
    await this.pinecone.upsert({
      vectors: [{
        id: url,
        values: embedding,
        metadata: {
          url,
          title,
          contentType,
          templateId
        }
      }]
    });
  }

  // ... Rest der Klasse
} 