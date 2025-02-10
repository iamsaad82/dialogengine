import { NextResponse } from 'next/server';
import { WebsiteScanner } from '@/lib/services/scanner';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT;
const PINECONE_HOST = process.env.PINECONE_HOST;
const PINECONE_INDEX = process.env.PINECONE_INDEX;
const REDIS_URL = process.env.REDIS_URL;
export async function POST(request) {
    try {
        const { url } = await request.json();
        if (!url || typeof url !== 'string') {
            return NextResponse.json({ error: 'Ungültige Anfrage: URL fehlt oder ist kein String' }, { status: 400 });
        }
        const scanner = new WebsiteScanner({
            openaiApiKey: OPENAI_API_KEY,
            pineconeApiKey: PINECONE_API_KEY,
            pineconeEnvironment: PINECONE_ENVIRONMENT,
            pineconeHost: PINECONE_HOST,
            pineconeIndex: PINECONE_INDEX,
            redisUrl: REDIS_URL
        });
        console.log(`Starte Scan von ${url}...`);
        await scanner.scanWebsite(url);
        console.log('Scan abgeschlossen');
        return NextResponse.json({ status: 'success' });
    }
    catch (error) {
        console.error('Fehler beim Scannen:', error);
        return NextResponse.json({ error: 'Fehler beim Scannen der Website' }, { status: 500 });
    }
}
