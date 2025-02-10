export class FirecrawlScanner {
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

        // Exakte URL-Pfad-Matches
        if (path.includes('/jobs/')) return 'Stellenangebot';
        if (path.includes('/team/')) return 'Team-Übersicht';
        if (path.includes('/unsere-projekte/')) return 'Projekt-Übersicht';
        if (path.includes('/esg/')) return 'ESG-Bericht';
        if (path.includes('/news/') || path.includes('/aktuelles/')) return 'Neuigkeit';
        if (path.includes('/impressum/')) return 'Rechtliches';
        if (path.includes('/datenschutz/')) return 'Rechtliches';
        if (path.includes('/agb/')) return 'Rechtliches';

        // Titel-basierte Matches
        if (titleLower.includes('center') || titleLower.includes('shopping')) return 'Shopping-Center';
        if (titleLower.includes('job') || titleLower.includes('stelle') || titleLower.includes('karriere')) return 'Stellenangebot';
        if (titleLower.includes('projekt') || titleLower.includes('referenz')) return 'Projekt';
        if (titleLower.includes('news') || titleLower.includes('aktuell')) return 'Neuigkeit';
        if (titleLower.includes('team') || titleLower.includes('über uns')) return 'Team';
        if (titleLower.includes('kontakt')) return 'Kontakt';
        if (titleLower.includes('service')) return 'Service';
        if (titleLower.includes('beratung')) return 'Beratung';

        // Fallback für unbekannte Inhaltstypen
        return 'Allgemein';
    }

    private async saveToVectorStore(jobId: string, url: string, title: string, content: string): Promise<void> {
        const contentType = this.determineContentType(url, title);
        const templateId = await this.redis.get(`scan:${jobId}:templateId`);

        const metadata = {
            url,
            title,
            contentType,
            templateId: templateId || ''
        };

        const embedding = await this.embedder.embed(content);
        await this.pinecone.upsert({
            vectors: [{
                id: url,
                values: embedding,
                metadata
            }]
        });
    }
} 