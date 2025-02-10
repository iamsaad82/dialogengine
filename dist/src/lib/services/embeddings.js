"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmbeddings = exports.OpenAIEmbedding = void 0;
const redis_1 = require("@upstash/redis");
// Kostengünstige Caching-Lösung
const redis = redis_1.Redis.fromEnv();
class OpenAIEmbedding {
    constructor() {
        throw new Error('OpenAI Embeddings sind derzeit in Entwicklung.');
    }
    async getEmbedding() {
        throw new Error('OpenAI Embeddings sind derzeit in Entwicklung.');
    }
    async embedChunks() {
        throw new Error('OpenAI Embeddings sind derzeit in Entwicklung.');
    }
    async findSimilar() {
        throw new Error('OpenAI Embeddings sind derzeit in Entwicklung.');
    }
}
exports.OpenAIEmbedding = OpenAIEmbedding;
const getEmbeddings = async (text) => {
    if (!process.env.OPENAI_API_KEY) {
        console.log('OpenAI API Key nicht konfiguriert');
        return null;
    }
    try {
        // ... rest of the code ...
    }
    catch (error) {
        console.error('Fehler beim Erstellen der Embeddings:', error);
        return null;
    }
};
exports.getEmbeddings = getEmbeddings;
