"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsiteScanner = void 0;
const ioredis_1 = require("ioredis");
const vectorizer_js_1 = require("./vectorizer.js");
const cheerio = __importStar(require("cheerio"));
class WebsiteScanner {
    constructor(config) {
        this.vectorizer = new vectorizer_js_1.ContentVectorizer({
            openaiApiKey: config.openaiApiKey,
            pineconeApiKey: config.pineconeApiKey,
            pineconeEnvironment: config.pineconeEnvironment || process.env.PINECONE_ENVIRONMENT,
            pineconeHost: config.pineconeHost || process.env.PINECONE_HOST,
            pineconeIndex: config.pineconeIndex || process.env.PINECONE_INDEX
        });
        if (config.redisUrl) {
            this.redis = new ioredis_1.Redis(config.redisUrl, {
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => {
                    if (times > 3) {
                        console.error('Redis-Verbindung fehlgeschlagen nach 3 Versuchen');
                        return null;
                    }
                    return Math.min(times * 1000, 3000);
                }
            });
            this.redis.on('error', (error) => {
                console.error('Redis Fehler:', error);
            });
        }
    }
    async updateProgress(progress) {
        if (this.redis) {
            await this.redis.set('scan:status', JSON.stringify(progress));
        }
    }
    async fetchPage(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    }
    extractContent(html) {
        const $ = cheerio.load(html);
        // Entferne unerwünschte Elemente
        $('script').remove();
        $('style').remove();
        $('nav').remove();
        $('footer').remove();
        $('header').remove();
        const title = $('title').text().trim() || $('h1').first().text().trim() || '';
        // Extrahiere den Hauptinhalt
        const mainContent = $('main').text() || $('article').text() || $('body').text();
        const content = mainContent
            .replace(/\s+/g, ' ')
            .trim();
        return { title, content };
    }
    async scanUrl(url) {
        try {
            console.log(`Scanne URL: ${url}`);
            const html = await this.fetchPage(url);
            const { title, content } = this.extractContent(html);
            await this.vectorizer.indexContent([{
                    url,
                    title,
                    content
                }]);
            console.log(`URL erfolgreich indexiert: ${url}`);
        }
        catch (error) {
            console.error(`Fehler beim Scannen von ${url}:`, error);
            throw error;
        }
    }
    async scanWebsite(baseUrl) {
        try {
            await this.updateProgress({
                status: 'running',
                pagesScanned: 0,
                totalPages: 1
            });
            await this.scanUrl(baseUrl);
            await this.updateProgress({
                status: 'completed',
                pagesScanned: 1,
                totalPages: 1
            });
        }
        catch (error) {
            console.error('Fehler beim Website-Scan:', error);
            await this.updateProgress({
                status: 'error',
                pagesScanned: 0,
                totalPages: 1,
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
            throw error;
        }
    }
}
exports.WebsiteScanner = WebsiteScanner;
