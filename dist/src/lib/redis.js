"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = void 0;
exports.testRedisConnection = testRedisConnection;
const ioredis_1 = __importDefault(require("ioredis"));
// Singleton-Pattern für Redis-Verbindung
const getRedisClient = (() => {
    let client = null;
    return () => {
        if (!client) {
            const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
            const redisConfig = {
                retryStrategy: (times) => {
                    if (times > 3) {
                        console.error('Redis-Verbindung fehlgeschlagen nach 3 Versuchen');
                        return null;
                    }
                    return Math.min(times * 1000, 3000);
                },
                maxRetriesPerRequest: 3,
                connectTimeout: 20000,
                lazyConnect: true,
                enableReadyCheck: true,
                enableOfflineQueue: true,
                family: 4, // Erzwinge IPv4
                commandTimeout: 10000,
                reconnectOnError: (err) => {
                    const targetError = 'READONLY';
                    if (err.message.includes(targetError)) {
                        return true;
                    }
                    return false;
                }
            };
            client = new ioredis_1.default(redisUrl, redisConfig);
            client.on('error', (error) => {
                console.error('Redis Fehler:', error);
            });
            client.on('connect', () => {
                console.log('Redis verbunden');
            });
            client.on('ready', () => {
                console.log('Redis bereit');
            });
            client.on('reconnecting', () => {
                console.log('Redis versucht Wiederverbindung...');
            });
            client.on('end', () => {
                console.log('Redis-Verbindung beendet');
                client = null;
            });
            // Zusätzliche Event-Handler für besseres Monitoring
            client.on('warning', (warning) => {
                console.warn('Redis Warnung:', warning);
            });
            client.on('close', () => {
                console.log('Redis-Verbindung geschlossen');
            });
        }
        return client;
    };
})();
exports.getRedisClient = getRedisClient;
async function testRedisConnection() {
    const redis = getRedisClient();
    try {
        const result = await redis.ping();
        if (result === 'PONG') {
            console.log('Redis-Verbindung erfolgreich getestet');
        }
        else {
            console.error('Redis-Verbindungstest fehlgeschlagen: Unerwartete Antwort');
        }
    }
    catch (error) {
        console.error('Redis-Verbindungstest fehlgeschlagen:', error);
        throw error;
    }
}
