"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirecrawlScanner = void 0;
const ioredis_1 = require("ioredis");
const vectorizer_1 = require("./vectorizer");
class FirecrawlScanner {
    constructor() {
        this.vectorizer = new vectorizer_1.ContentVectorizer({
            openaiApiKey: process.env.OPENAI_API_KEY || '',
            pineconeApiKey: process.env.PINECONE_API_KEY || '',
            pineconeEnvironment: process.env.PINECONE_ENVIRONMENT,
            pineconeHost: process.env.PINECONE_HOST,
            pineconeIndex: process.env.PINECONE_INDEX
        });
        this.baseUrl = process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev';
        this.apiKey = process.env.FIRECRAWL_API_KEY || '';
        if (!this.apiKey) {
            throw new Error('FIRECRAWL_API_KEY ist erforderlich');
        }
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
            family: 4,
            commandTimeout: 10000
        };
        this.redis = new ioredis_1.Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', redisConfig);
        this.redis.on('error', (error) => {
            console.error('Redis Fehler:', error);
        });
        this.redis.on('connect', () => {
            console.log('Redis verbunden');
        });
        this.redis.on('ready', () => {
            console.log('Redis bereit');
            // Räume alte Jobs auf, wenn Redis bereit ist
            this.cleanupOldJobs();
        });
        this.redis.on('close', () => {
            console.log('Redis-Verbindung geschlossen');
        });
        // Initialer Verbindungstest
        this.testRedisConnection();
    }
    async testRedisConnection() {
        try {
            const result = await this.redis.ping();
            if (result !== 'PONG') {
                throw new Error('Redis-Verbindungstest fehlgeschlagen: Unerwartete Antwort');
            }
            console.log('Redis-Verbindung erfolgreich getestet');
        }
        catch (error) {
            console.error('Redis-Verbindungstest fehlgeschlagen:', error);
            throw error;
        }
    }
    async updateProgress(progress) {
        if (!this.redis)
            return;
        try {
            const status = await this.redis.status;
            if (status !== 'ready') {
                console.warn('Redis nicht verbunden, versuche Wiederverbindung...');
                await this.testRedisConnection();
            }
            await this.redis.set('scan:status', JSON.stringify(progress));
            console.log('Scan-Status aktualisiert:', progress);
        }
        catch (error) {
            console.error('Fehler beim Aktualisieren des Scan-Status:', error);
            throw error;
        }
    }
    async startCrawlJob(url) {
        const apiUrl = `${this.baseUrl}/v1/crawl`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url,
                options: {
                    depth: 3,
                    selectors: {
                        include: ['article', 'main', '.content', '.post'],
                        exclude: ['nav', 'header', 'footer', '.navigation', '.menu']
                    }
                }
            })
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(`HTTP error! status: ${response.status} - ${JSON.stringify(data)}`);
        }
        const data = await response.json();
        return data.id;
    }
    async checkJobStatus(jobId) {
        const url = `${this.baseUrl}/v1/crawl/${jobId}`;
        console.log(`Prüfe Job-Status: ${url}`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                signal: controller.signal
            });
            clearTimeout(timeout);
            if (!response.ok) {
                console.error('Job-Status-Fehler:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: response.url
                });
                throw new Error(`Job-Status-Prüfung fehlgeschlagen: ${response.status} ${response.statusText}`);
            }
            const responseText = await response.text();
            console.log('Job-Status-Antwort:', {
                url: response.url,
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                body: responseText
            });
            const data = JSON.parse(responseText);
            if (!data.success) {
                throw new Error('Job-Status-Antwort zeigt Fehler an');
            }
            return data;
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new Error('Job-Status-Prüfung wegen Zeitüberschreitung abgebrochen');
                }
                throw error;
            }
            throw new Error('Unbekannter Fehler bei Job-Status-Prüfung');
        }
    }
    determineContentType(url, title) {
        const path = new URL(url).pathname.toLowerCase();
        const titleLower = title.toLowerCase();
        // Spezifische URL-Pfad-Prüfungen
        if (path.includes('/jobs/'))
            return 'Stellenangebot';
        if (path.includes('/team/'))
            return 'Team-Mitglied';
        if (path.includes('/news/') || path.includes('/aktuelles/'))
            return 'Neuigkeit';
        if (path.includes('/center/') || path.includes('-center'))
            return 'Shopping-Center';
        if (path.includes('/property-management/'))
            return 'Dienstleistung';
        if (path.includes('/esg/'))
            return 'Nachhaltigkeit';
        if (path.includes('/kunst/'))
            return 'Kunst & Kultur';
        if (path.includes('/impressum/'))
            return 'Rechtliches';
        // Titel-basierte Prüfungen
        if (titleLower.includes('center') || titleLower.includes('park'))
            return 'Shopping-Center';
        if (titleLower.includes('job') || titleLower.includes('stelle') || titleLower.includes('karriere'))
            return 'Stellenangebot';
        if (titleLower.includes('kontakt') || titleLower.includes('impressum'))
            return 'Rechtliches';
        if (titleLower.includes('news') || titleLower.includes('aktuell'))
            return 'Neuigkeit';
        if (titleLower.includes('kunst') || titleLower.includes('kultur'))
            return 'Kunst & Kultur';
        if (titleLower.includes('team') || titleLower.includes('über uns'))
            return 'Team-Mitglied';
        if (titleLower.includes('esg') || titleLower.includes('nachhaltigkeit'))
            return 'Nachhaltigkeit';
        if (titleLower.includes('service') || titleLower.includes('dienstleistung'))
            return 'Dienstleistung';
        // Fallback für unbekannte Inhaltstypen
        return 'Allgemein';
    }
    async waitForJobCompletion(jobId) {
        console.log(`Warte auf Abschluss des Jobs ${jobId}...`);
        let attempts = 0;
        const maxAttempts = 30;
        let waitTime = 3000;
        while (attempts < maxAttempts) {
            attempts++;
            const status = await this.checkJobStatus(jobId);
            console.log(`Job Status: ${status.status} (${status.completed}/${status.total}) (Versuch ${attempts}/${maxAttempts})`);
            if (status.status === 'completed') {
                if (status.data && status.data.length > 0) {
                    console.log(`Verarbeite ${status.data.length} gefundene Seiten...`);
                    let successCount = 0;
                    let errorCount = 0;
                    // Hole die Template-ID aus Redis
                    const templateId = await this.redis.get(`scan:${jobId}:templateId`) || undefined;
                    console.log('Template-ID für Job:', templateId);
                    if (!templateId) {
                        console.warn('Keine Template-ID gefunden für Job:', jobId);
                    }
                    for (const item of status.data) {
                        if (item.markdown && item.metadata) {
                            try {
                                const contentType = this.determineContentType(item.metadata.url, item.metadata.title);
                                console.log('Indexiere Dokument:', {
                                    url: item.metadata.url,
                                    title: item.metadata.title,
                                    templateId,
                                    contentType
                                });
                                await this.vectorizer.indexContent([{
                                        url: item.metadata.url,
                                        title: item.metadata.title,
                                        content: item.markdown,
                                        metadata: {
                                            templateId,
                                            contentType
                                        }
                                    }]);
                                successCount++;
                                console.log(`Seite erfolgreich indexiert: ${item.metadata.url}`);
                            }
                            catch (error) {
                                errorCount++;
                                console.error(`Fehler beim Indexieren von ${item.metadata.url}:`, error);
                            }
                        }
                    }
                    console.log(`Indexierung abgeschlossen: ${successCount} erfolgreich, ${errorCount} fehlgeschlagen`);
                }
                else {
                    console.warn('Keine Seiten im Scan-Ergebnis gefunden');
                }
                return;
            }
            // Warte vor dem nächsten Versuch
            await new Promise(resolve => setTimeout(resolve, waitTime));
            waitTime = Math.min(waitTime * 1.5, 10000); // Exponentielles Backoff bis max. 10 Sekunden
        }
        throw new Error(`Job nicht abgeschlossen nach ${maxAttempts} Versuchen`);
    }
    async scanWebsite(baseUrl) {
        try {
            await this.updateProgress({
                status: 'running',
                pagesScanned: 0,
                totalPages: 1
            });
            console.log(`Scanne URL mit Firecrawl: ${baseUrl}`);
            // Starte den Crawling-Job
            const jobId = await this.startCrawlJob(baseUrl);
            // Warte auf Abschluss und hole das Ergebnis
            await this.waitForJobCompletion(jobId);
            await this.updateProgress({
                status: 'completed',
                pagesScanned: 1,
                totalPages: 1
            });
            console.log('Scan erfolgreich abgeschlossen');
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
    extractWaitTime(errorMessage) {
        // Versuche zuerst, die Wartezeit aus der "retry after" Nachricht zu extrahieren
        const retryMatch = errorMessage.match(/please retry after (\d+)s/);
        if (retryMatch && retryMatch[1]) {
            return parseInt(retryMatch[1], 10) * 1000;
        }
        // Fallback: Suche nach einer Zeitangabe in Sekunden
        const secondsMatch = errorMessage.match(/wait (\d+) seconds/);
        if (secondsMatch && secondsMatch[1]) {
            return parseInt(secondsMatch[1], 10) * 1000;
        }
        // Wenn keine spezifische Zeit gefunden wurde, gib null zurück
        return null;
    }
    async startScanWithRetry(url, templateId) {
        const maxRetries = 3;
        let retryCount = 0;
        let lastError = null;
        while (retryCount < maxRetries) {
            try {
                const apiUrl = `${this.baseUrl}/v1/crawl`;
                console.log('Sende Request an:', apiUrl, {
                    url,
                    templateId,
                    apiKey: this.apiKey ? `${this.apiKey.slice(0, 8)}...` : 'nicht gesetzt'
                });
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                    body: JSON.stringify({ url })
                });
                console.log('Response Status:', response.status);
                const responseText = await response.text();
                console.log('Response Body:', responseText);
                if (!response.ok) {
                    if (response.status === 429) {
                        const waitTime = this.extractWaitTime(responseText) || 20000;
                        console.log(`Rate-Limit erreicht, warte ${waitTime / 1000} Sekunden...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        continue;
                    }
                    throw new Error(`HTTP error! status: ${response.status} - ${responseText}`);
                }
                try {
                    const data = JSON.parse(responseText);
                    if (!data.success || !data.id) {
                        throw new Error(`Ungültige API-Antwort: ${responseText}`);
                    }
                    const jobId = data.id;
                    // Speichere Job-Informationen
                    await Promise.all([
                        this.redis.set(`scan:${jobId}:templateId`, templateId || ''),
                        this.redis.set(`scan:${jobId}:url`, url),
                        this.redis.set(`scan:${jobId}`, JSON.stringify({
                            status: 'running',
                            progress: {
                                completed: 0,
                                total: 1
                            }
                        }))
                    ]);
                    console.log('Job erfolgreich erstellt:', { jobId, templateId, url });
                    return jobId;
                }
                catch (parseError) {
                    console.error('Fehler beim Parsen der API-Antwort:', parseError);
                    throw new Error(`Ungültige JSON-Antwort: ${responseText}`);
                }
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                retryCount++;
                if (!(error instanceof Error && error.message.includes('429')) && retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
            }
        }
        throw new Error(`Scan konnte nach ${retryCount} Versuchen nicht gestartet werden: ${lastError?.message}`);
    }
    async cleanupInvalidJobs() {
        try {
            const keys = await this.redis.keys('scan:*');
            for (const key of keys) {
                if (key.endsWith(':url') || key.endsWith(':templateId'))
                    continue;
                const jobId = key.replace('scan:', '');
                const status = await this.redis.get(key);
                if (jobId === 'undefined' || !status) {
                    console.log('Lösche ungültigen Job:', jobId);
                    await Promise.all([
                        this.redis.del(`scan:${jobId}`),
                        this.redis.del(`scan:${jobId}:url`),
                        this.redis.del(`scan:${jobId}:templateId`)
                    ]);
                    continue;
                }
                try {
                    JSON.parse(status);
                }
                catch (parseError) {
                    console.error(`Ungültiger Status für Job ${jobId}, wird gelöscht`);
                    await Promise.all([
                        this.redis.del(`scan:${jobId}`),
                        this.redis.del(`scan:${jobId}:url`),
                        this.redis.del(`scan:${jobId}:templateId`)
                    ]);
                }
            }
        }
        catch (error) {
            console.error('Fehler beim Aufräumen der Jobs:', error);
        }
    }
    async startScan(url, templateId) {
        if (!url) {
            throw new Error('URL ist erforderlich');
        }
        // Validiere URL
        try {
            new URL(url);
        }
        catch (error) {
            throw new Error('Ungültige URL');
        }
        await this.cleanupInvalidJobs();
        await this.testRedisConnection();
        const jobId = await this.startScanWithRetry(url, templateId);
        // Speichere Timestamp
        await this.redis.set(`scan:${jobId}:timestamp`, Date.now().toString());
        return jobId;
    }
    async getJobStatus(jobId) {
        try {
            // Hole Status von Firecrawl API
            const status = await this.checkJobStatus(jobId);
            // Konvertiere Firecrawl-Status in unser Format
            const newStatus = {
                status: status.status === 'completed' ? 'completed' : 'running',
                progress: {
                    completed: status.data?.length || 0, // Anzahl der tatsächlich gescannten Seiten
                    total: status.data?.length || status.total || 1 // Gesamtanzahl oder aktuelle Anzahl wenn fertig
                }
            };
            // Hole URL aus Redis
            const redisUrl = await this.redis.get(`scan:${jobId}:url`);
            // Aktualisiere den Status in Redis
            await this.redis.set(`scan:${jobId}`, JSON.stringify(newStatus));
            // Wenn der Scan abgeschlossen ist und keine Daten vorhanden sind, setze auf error
            if (status.status === 'completed' && (!status.data || status.data.length === 0)) {
                return {
                    status: 'error',
                    error: 'Keine Seiten gefunden',
                    url: redisUrl || undefined
                };
            }
            return {
                ...newStatus,
                url: redisUrl || undefined
            };
        }
        catch (error) {
            console.error('Fehler beim Abrufen des Job-Status:', error);
            return {
                status: 'error',
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            };
        }
    }
    async cleanupOldJobs() {
        try {
            // Hole alle Job-Keys
            const keys = await this.redis.keys('scan:*');
            for (const key of keys) {
                // Ignoriere URL-Keys zunächst
                if (key.endsWith(':url'))
                    continue;
                const jobId = key.replace('scan:', '');
                const value = await this.redis.get(key);
                // Prüfe, ob der Wert ein gültiges JSON ist
                try {
                    if (value) {
                        JSON.parse(value);
                    }
                }
                catch (error) {
                    // Wenn kein gültiges JSON, lösche den Job-Key und den zugehörigen URL-Key
                    console.log(`Lösche ungültigen Job-Status: ${key}`);
                    await Promise.all([
                        this.redis.del(key),
                        this.redis.del(`scan:${jobId}:url`)
                    ]);
                }
            }
            console.log('Alte Jobs aufgeräumt');
        }
        catch (error) {
            console.error('Fehler beim Aufräumen alter Jobs:', error);
        }
    }
    async clearAllJobs() {
        try {
            const keys = await this.redis.keys('scan:*');
            if (keys.length > 0) {
                await this.redis.del(...keys);
                console.log(`${keys.length} Scan-Keys gelöscht`);
            }
            else {
                console.log('Keine Scan-Keys zum Löschen gefunden');
            }
        }
        catch (error) {
            console.error('Fehler beim Löschen aller Jobs:', error);
            throw error;
        }
    }
    async cancelCrawlJob(jobId) {
        const url = `${this.baseUrl}/v1/crawl/${jobId}/cancel`;
        console.log(`Breche Job ab: ${url}`);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            if (!response.ok) {
                throw new Error(`Fehler beim Abbrechen des Jobs: ${response.status} ${response.statusText}`);
            }
            // Lösche Job-Informationen aus Redis
            await Promise.all([
                this.redis.del(`scan:${jobId}`),
                this.redis.del(`scan:${jobId}:url`),
                this.redis.del(`scan:${jobId}:templateId`),
                this.redis.del(`scan:${jobId}:timestamp`)
            ]);
            console.log(`Job ${jobId} erfolgreich abgebrochen`);
        }
        catch (error) {
            console.error(`Fehler beim Abbrechen des Jobs ${jobId}:`, error);
            throw error;
        }
    }
}
exports.FirecrawlScanner = FirecrawlScanner;
