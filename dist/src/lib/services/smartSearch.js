"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartSearchHandler = void 0;
const openai_1 = __importDefault(require("openai"));
const vectorizer_js_1 = require("./vectorizer.js");
const ioredis_1 = require("ioredis");
class RedisClient {
    constructor(url) {
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
        this.redis = new ioredis_1.Redis(url, {
            retryStrategy: (times) => {
                if (times > this.maxRetries) {
                    console.error('Redis-Verbindung fehlgeschlagen nach 3 Versuchen');
                    return null;
                }
                return Math.min(times * this.retryDelay, 3000);
            },
            maxRetriesPerRequest: this.maxRetries
        });
        this.redis.on('error', (error) => {
            console.error('Redis Fehler:', error);
        });
        this.redis.on('connect', () => {
            console.log('Redis verbunden');
        });
    }
    async withRetry(operation) {
        let lastError = null;
        for (let i = 0; i < this.maxRetries; i++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                console.error(`Redis operation failed (attempt ${i + 1}/${this.maxRetries}):`, error);
                if (i < this.maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, i)));
                }
            }
        }
        console.error('Redis operation failed after all retries:', lastError);
        return null;
    }
    async get(key) {
        const result = await this.withRetry(() => this.redis.get(key));
        if (result) {
            try {
                return JSON.parse(result);
            }
            catch (error) {
                console.error('Failed to parse Redis result:', error);
                return null;
            }
        }
        return null;
    }
    async set(key, value, ttlSeconds) {
        const serializedValue = JSON.stringify(value);
        await this.withRetry(() => ttlSeconds
            ? this.redis.setex(key, ttlSeconds, serializedValue)
            : this.redis.set(key, serializedValue));
    }
    async isHealthy() {
        try {
            const result = await this.redis.ping();
            return result === 'PONG';
        }
        catch (error) {
            console.error('Redis health check failed:', error);
            return false;
        }
    }
}
class SmartSearchHandler {
    constructor(config) {
        this.openai = new openai_1.default({
            apiKey: config.openaiApiKey
        });
        this.vectorizer = new vectorizer_js_1.ContentVectorizer({
            openaiApiKey: config.openaiApiKey,
            pineconeApiKey: config.pineconeApiKey,
            pineconeEnvironment: config.pineconeEnvironment,
            pineconeIndex: config.pineconeIndex
        });
        if (config.redisUrl) {
            this.redis = new RedisClient(config.redisUrl);
        }
        this.temperature = config.temperature || 0.7;
        this.maxTokens = config.maxTokens || 500;
    }
    async analyzeContent(text, query) {
        const response = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `Du bist ein Experte für Inhaltsanalyse. Analysiere den gegebenen Text und identifiziere den Typ und relevante Metadaten. 
          Mögliche Typen sind:
          - info (einfache Information)
          - service (Dienstleistung mit Button)
          - product (Produkt mit Bild/Preis)
          - event (Veranstaltung mit Datum/Ort)
          - location (Standort mit Adresse)
          - video (Video mit Vorschau)
          - link (Link mit Vorschaukarte)
          - contact (Kontaktinformation)
          - faq (FAQ mit verwandten Fragen)
          - download (Download mit Dateidetails)

          Antworte im JSON-Format mit:
          {
            "type": "einer der obigen Typen",
            "metadata": {
              // relevante Felder je nach Typ
            }
          }`
                },
                {
                    role: "user",
                    content: `Frage: ${query}\nInhalt: ${text}`
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1
        });
        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('Keine Antwort von der KI erhalten');
        }
        return JSON.parse(content);
    }
    async generateStructuredAnswer(query, context, contentType, metadata) {
        const response = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `Du bist ein hilfreicher Assistent. Erstelle eine strukturierte Antwort im Format für den Typ "${contentType}".
          Verwende Markdown für die Formatierung. Berücksichtige die Metadaten in deiner Antwort.
          Die Antwort sollte natürlich und hilfreich sein.`
                },
                {
                    role: "user",
                    content: `Frage: ${query}\nKontext: ${context}\nMetadaten: ${JSON.stringify(metadata)}`
                }
            ],
            temperature: this.temperature,
            max_tokens: this.maxTokens
        });
        return response.choices[0].message.content || '';
    }
    async handleQuery(query) {
        // Cache-Check mit Fehlerbehandlung
        if (this.redis) {
            const isHealthy = await this.redis.isHealthy();
            if (!isHealthy) {
                console.warn('Redis is unhealthy, skipping cache');
            }
            else {
                const cacheKey = `response:${Buffer.from(query).toString('base64')}`;
                const cached = await this.redis.get(cacheKey);
                if (cached) {
                    return cached;
                }
            }
        }
        // Vektorsuche
        const searchResults = await this.vectorizer.searchSimilar(query, 3);
        // Kontext vorbereiten
        const context = searchResults
            .map(result => result.text)
            .join('\n\n');
        // Inhaltsanalyse
        const analysis = await this.analyzeContent(context, query);
        // Strukturierte Antwort generieren
        const answer = await this.generateStructuredAnswer(query, context, analysis.type, analysis.metadata);
        // Quellen gruppieren
        const sources = searchResults.reduce((acc, result) => {
            const url = result.metadata.url;
            const existingSource = acc.find(s => s.url === url);
            if (existingSource) {
                existingSource.snippets.push({
                    text: result.text,
                    score: result.score
                });
            }
            else {
                acc.push({
                    url,
                    title: result.metadata.title,
                    snippets: [{
                            text: result.text,
                            score: result.score
                        }]
                });
            }
            return acc;
        }, []);
        // Finale Antwort
        const response = {
            type: analysis.type,
            text: answer,
            metadata: analysis.metadata,
            sources
        };
        // Cache speichern mit Fehlerbehandlung
        if (this.redis) {
            const isHealthy = await this.redis.isHealthy();
            if (isHealthy) {
                const cacheKey = `response:${Buffer.from(query).toString('base64')}`;
                await this.redis.set(cacheKey, response, 3600); // 1 Stunde TTL
            }
        }
        return response;
    }
}
exports.SmartSearchHandler = SmartSearchHandler;
