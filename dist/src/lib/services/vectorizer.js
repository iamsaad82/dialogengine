"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentVectorizer = void 0;
const openai_1 = __importDefault(require("openai"));
const pinecone_1 = require("@pinecone-database/pinecone");
class ContentVectorizer {
    constructor(config) {
        this.config = config;
        this.openai = new openai_1.default({
            apiKey: config.openaiApiKey
        });
        this.pinecone = new pinecone_1.Pinecone({
            apiKey: config.pineconeApiKey
        });
        this.indexName = config.pineconeIndex || process.env.PINECONE_INDEX || 'dialog-engine';
        this.host = config.pineconeHost || process.env.PINECONE_HOST || '';
    }
    async getEmbedding(text) {
        if (!text) {
            throw new Error('Text für Embedding darf nicht leer sein');
        }
        const response = await this.openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: text.slice(0, 8000) // Begrenzen auf 8000 Zeichen (OpenAI Limit)
        });
        return response.data[0].embedding;
    }
    async indexContent(documents) {
        const index = this.pinecone.index(this.indexName);
        // Batch-Verarbeitung für bessere Performance
        const batchSize = 100;
        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            // Erstelle eine Map für URLs, um Duplikate zu vermeiden
            const urlMap = new Map();
            const records = await Promise.all(batch.map(async (doc) => {
                if (!doc.content) {
                    console.warn(`Überspringe Dokument ohne Inhalt: ${doc.url}`);
                    return null;
                }
                // Überspringe Duplikate
                if (urlMap.has(doc.url)) {
                    console.warn(`Überspringe Duplikat: ${doc.url}`);
                    return null;
                }
                urlMap.set(doc.url, true);
                try {
                    const embedding = await this.getEmbedding(doc.content);
                    // Verwende die URL als ID, um Duplikate zu überschreiben
                    const id = Buffer.from(doc.url).toString('base64');
                    // Begrenze die Textlänge in den Metadaten
                    const truncatedContent = doc.content.slice(0, 1000) + (doc.content.length > 1000 ? '...' : '');
                    return {
                        id,
                        values: embedding,
                        metadata: {
                            url: doc.url,
                            title: doc.title.slice(0, 100),
                            text: truncatedContent,
                            contentType: doc.metadata?.contentType || 'info',
                            templateId: doc.metadata?.templateId
                        }
                    };
                }
                catch (error) {
                    console.error(`Fehler beim Erstellen des Embeddings für ${doc.url}:`, error);
                    return null;
                }
            }));
            const validRecords = records.filter((record) => record !== null);
            if (validRecords.length > 0) {
                console.log(`Indexiere ${validRecords.length} eindeutige Dokumente...`);
                await index.upsert(validRecords);
            }
        }
    }
    async searchSimilar(query, limit = 3, templateId) {
        const queryEmbedding = await this.getEmbedding(query);
        const index = this.pinecone.index(this.indexName);
        const filter = templateId ? { templateId } : undefined;
        const results = await index.query({
            vector: queryEmbedding,
            topK: limit,
            includeMetadata: true,
            includeValues: false,
            filter
        });
        return results.matches.map(match => ({
            text: String(match.metadata?.text || ''),
            score: match.score || 0,
            metadata: {
                url: String(match.metadata?.url || ''),
                title: String(match.metadata?.title || ''),
                contentType: String(match.metadata?.contentType || ''),
                templateId: String(match.metadata?.templateId || '')
            }
        }));
    }
    async getAllDocuments(templateId, limit = 50) {
        const index = this.pinecone.index(this.indexName);
        // Erstelle einen Dummy-Vektor für die Suche
        const dummyVector = Array(1536).fill(0);
        console.log('Suche Dokumente mit Template-ID:', templateId);
        try {
            const results = await index.query({
                vector: dummyVector,
                topK: limit,
                includeMetadata: true,
                includeValues: false,
                filter: {
                    templateId: { $eq: templateId }
                }
            });
            console.log('Rohe Pinecone-Antwort:', JSON.stringify(results, null, 2));
            console.log('Gefundene Dokumente:', results.matches.length);
            if (results.matches.length === 0) {
                console.log('Keine Dokumente gefunden. Prüfe Index-Status...');
                const stats = await index.describeIndexStats();
                console.log('Index-Statistiken:', JSON.stringify(stats, null, 2));
            }
            return results.matches.map(match => ({
                text: String(match.metadata?.text || ''),
                score: match.score || 0,
                metadata: {
                    url: String(match.metadata?.url || ''),
                    title: String(match.metadata?.title || ''),
                    contentType: String(match.metadata?.contentType || ''),
                    templateId: String(match.metadata?.templateId || '')
                }
            }));
        }
        catch (error) {
            console.error('Fehler bei der Dokumentenabfrage:', error);
            throw error;
        }
    }
    async updateContentType(url, contentType, templateId) {
        const index = this.pinecone.index(this.indexName);
        const id = Buffer.from(url).toString('base64');
        // Hole den existierenden Vektor
        const { records } = await index.fetch([id]);
        const vector = records[id];
        if (!vector) {
            throw new Error('Dokument nicht gefunden');
        }
        // Aktualisiere die Metadaten mit dem neuen Inhaltstyp
        await index.update({
            id,
            metadata: {
                ...vector.metadata,
                contentType,
                templateId
            }
        });
    }
}
exports.ContentVectorizer = ContentVectorizer;
