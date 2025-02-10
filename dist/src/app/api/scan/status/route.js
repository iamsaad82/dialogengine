import { NextResponse } from 'next/server';
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    retryStrategy: (times) => {
        if (times > 3) {
            console.error('Redis-Verbindung fehlgeschlagen nach 3 Versuchen');
            return null;
        }
        return Math.min(times * 1000, 3000);
    },
    maxRetriesPerRequest: 3
});
redis.on('error', (error) => {
    console.error('Redis Fehler:', error);
});
redis.on('connect', () => {
    console.log('Redis verbunden');
});
export async function GET() {
    try {
        console.log('Rufe Scan-Status ab...');
        const status = await redis.get('scan:status');
        console.log('Scan-Status:', status);
        if (!status) {
            return NextResponse.json({ status: 'not_found' });
        }
        return NextResponse.json(JSON.parse(status));
    }
    catch (error) {
        console.error('Fehler beim Abrufen des Status:', error);
        return NextResponse.json({ error: 'Fehler beim Abrufen des Status' }, { status: 500 });
    }
}
