"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const firecrawl_1 = require("../src/lib/services/firecrawl");
// Lade Umgebungsvariablen
(0, dotenv_1.config)({ path: '.env.development' });
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT;
const PINECONE_HOST = process.env.PINECONE_HOST;
const PINECONE_INDEX = process.env.PINECONE_INDEX;
const REDIS_URL = process.env.REDIS_URL;
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
if (!OPENAI_API_KEY || !PINECONE_API_KEY || !FIRECRAWL_API_KEY) {
    console.error('Fehlende Umgebungsvariablen!');
    process.exit(1);
}
async function main() {
    try {
        const scanner = new firecrawl_1.FirecrawlScanner();
        // Test-URL
        const testUrl = 'https://example.com';
        console.log('Starte Website-Scan mit Firecrawl...');
        const jobId = await scanner.startScan(testUrl);
        console.log('Scan gestartet mit Job-ID:', jobId);
        // Überwache den Status
        let isComplete = false;
        while (!isComplete) {
            const status = await scanner.getJobStatus(jobId);
            console.log('Job Status:', status);
            if (status.status === 'completed') {
                isComplete = true;
                console.log('Scan erfolgreich abgeschlossen!');
            }
            else if (status.status === 'error') {
                throw new Error(`Scan fehlgeschlagen: ${status.error}`);
            }
            else {
                // Warte 5 Sekunden vor der nächsten Statusabfrage
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }
    catch (error) {
        console.error('Fehler beim Scannen:', error);
        process.exit(1);
    }
}
main();
