# Dialog Engine - Troubleshooting Guide

## 1. Allgemeine Probleme

### 1.1 Smart Search funktioniert nicht

#### Symptome
- Keine Suchergebnisse
- Niedrige Relevanz-Scores
- Fehlende Kontext-Berücksichtigung

#### Diagnose
1. Pinecone Status prüfen
   ```bash
   curl https://api.dialog-engine.com/api/search/test
   ```

2. Vektoren überprüfen
   ```bash
   npm run pinecone:status
   ```

3. Logs analysieren
   ```bash
   npm run logs:search
   ```

#### Lösungen
1. **Keine Vektoren**
   ```bash
   # Neu indexieren
   npm run vectorize:all
   ```

2. **Niedrige Relevanz**
   ```typescript
   // Schwellenwert anpassen
   // src/lib/services/search/core/search.ts
   const MIN_SCORE = 0.3
   const FALLBACK_SCORE = 0.2
   ```

3. **Kontext-Probleme**
   ```typescript
   // Context-Gewichtung erhöhen
   // src/lib/services/search/core/context.ts
   const CONTEXT_WEIGHT = 0.4
   ```

### 1.2 Handler-Probleme

#### Symptome
- Handler wird nicht ausgewählt
- Falsche Handler-Auswahl
- Unerwartete Antworten

#### Diagnose
1. Handler-Logs prüfen
   ```bash
   npm run logs:handler
   ```

2. Handler-Tests ausführen
   ```bash
   npm run test:handlers
   ```

#### Lösungen
1. **Handler-Erkennung**
   ```typescript
   // Keywords aktualisieren
   // src/lib/handlers/dental/index.ts
   private keywords = [
     'zahn', 'zahnarzt', 'zahnreinigung',
     'prophylaxe', 'zahnersatz', 'implantate'
   ]
   ```

2. **Handler-Priorität**
   ```typescript
   // Priorität anpassen
   // src/lib/handlers/manager.ts
   const HANDLER_PRIORITY = {
     DentalHandler: 100,
     TherapyHandler: 90,
     // ...
   }
   ```

### 1.3 Performance-Probleme

#### Symptome
- Langsame Antwortzeiten
- Hohe Serverauslastung
- Timeouts

#### Diagnose
1. Performance Metriken
   ```bash
   npm run metrics:show
   ```

2. Slow Queries
   ```bash
   npm run db:slow-queries
   ```

3. Resource Usage
   ```bash
   npm run monitor:resources
   ```

#### Lösungen
1. **Caching aktivieren**
   ```typescript
   // src/lib/cache/index.ts
   const CACHE_TTL = 3600 // 1 Stunde
   const CACHE_ENABLED = true
   ```

2. **Query Optimierung**
   ```typescript
   // src/lib/db/queries.ts
   // Indices hinzufügen
   await prisma.$executeRaw`
     CREATE INDEX IF NOT EXISTS idx_conversations_user_id
     ON conversations(user_id)
   `
   ```

3. **Resource Limits**
   ```typescript
   // src/lib/config/resources.ts
   export const LIMITS = {
     maxConcurrentJobs: 10,
     maxMemoryUsage: '1GB',
     maxProcessingTime: 30000
   }
   ```

## 2. Spezifische Fehler

### 2.1 Datenbank-Fehler

#### Error: Connection refused
```bash
# Datenbank-Status prüfen
npm run db:status

# Verbindung testen
npm run db:test-connection

# Neu verbinden
npm run db:reconnect
```

#### Error: Deadlock detected
```sql
-- Deadlocks identifizieren
SELECT * FROM pg_locks pl
JOIN pg_stat_activity psa
  ON pl.pid = psa.pid
WHERE locked_transaction IS NOT NULL;

-- Deadlock auflösen
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction';
```

### 2.2 Redis-Fehler

#### Error: READONLY You can't write against a read only replica
```bash
# Redis-Status prüfen
npm run redis:status

# Master/Replica Status
npm run redis:replication-status

# Failover durchführen
npm run redis:failover
```

#### Error: Connection timeout
```typescript
// src/lib/redis/config.ts
export const REDIS_CONFIG = {
  retryStrategy: (times: number) => {
    if (times > 3) return null
    return Math.min(times * 1000, 3000)
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true
}
```

### 2.3 Pinecone-Fehler

#### Error: Too many requests
```typescript
// src/lib/services/vectorizer/index.ts
export class RateLimitedVectorizer {
  private queue = new Queue()
  private rateLimiter = new RateLimiter({
    maxRequests: 100,
    perSeconds: 60
  })

  async vectorize(text: string): Promise<number[]> {
    await this.rateLimiter.wait()
    return this.vectorizer.vectorize(text)
  }
}
```

#### Error: Index not found
```bash
# Index Status prüfen
npm run pinecone:status

# Index neu erstellen
npm run pinecone:create-index

# Daten neu indexieren
npm run vectorize:all
```

## 3. Monitoring & Debugging

### 3.1 Logging

#### Debug-Logging aktivieren
```typescript
// src/lib/logger/index.ts
export const logger = createLogger({
  level: 'debug',
  format: combine(
    timestamp(),
    prettyPrint()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'debug.log' })
  ]
})
```

#### Log-Analyse
```bash
# Error-Logs
npm run logs:errors

# Performance-Logs
npm run logs:performance

# Security-Logs
npm run logs:security
```

### 3.2 Metriken

#### System-Metriken
```typescript
// src/lib/monitoring/metrics.ts
export class MetricsCollector {
  async collect(): Promise<Metrics> {
    return {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      handlers: await this.getHandlerMetrics(),
      search: await this.getSearchMetrics(),
      database: await this.getDatabaseMetrics()
    }
  }
}
```

#### Business-Metriken
```typescript
// src/lib/monitoring/business.ts
export class BusinessMetrics {
  async track(metric: BusinessMetric): Promise<void> {
    await prisma.metric.create({
      data: {
        name: metric.name,
        value: metric.value,
        metadata: metric.metadata,
        timestamp: new Date()
      }
    })
  }
}
```

### 3.3 Alerts

#### Alert-Konfiguration
```typescript
// src/lib/monitoring/alerts.ts
export const ALERT_CONFIG = {
  errorRate: {
    threshold: 0.05, // 5%
    window: '5m'
  },
  responseTime: {
    threshold: 1000, // 1s
    window: '1m'
  },
  memoryUsage: {
    threshold: 0.9, // 90%
    window: '5m'
  }
}
```

#### Alert-Handler
```typescript
// src/lib/monitoring/handlers.ts
export class AlertHandler {
  async handleAlert(alert: Alert): Promise<void> {
    // Log Alert
    await this.logAlert(alert)

    // Notify Team
    await this.notifyTeam(alert)

    // Auto-Recovery
    if (alert.autoRecover) {
      await this.triggerRecovery(alert)
    }
  }
}
```

## 4. Recovery-Prozeduren

### 4.1 Datenbank-Recovery

#### Backup wiederherstellen
```bash
# Backup auflisten
npm run backup:list

# Backup wiederherstellen
npm run backup:restore <backup-id>

# Integrität prüfen
npm run db:verify
```

#### Daten reparieren
```sql
-- Inkonsistenzen finden
SELECT * FROM conversations c
LEFT JOIN users u ON c.user_id = u.id
WHERE u.id IS NULL;

-- Bereinigen
DELETE FROM conversations
WHERE user_id NOT IN (SELECT id FROM users);
```

### 4.2 Cache-Recovery

#### Cache neu aufbauen
```typescript
// src/lib/cache/rebuild.ts
export async function rebuildCache(): Promise<void> {
  // Clear existing cache
  await redis.flushall()

  // Rebuild from database
  const data = await loadCacheableData()
  
  // Parallel cache filling
  await Promise.all(
    data.map(item => redis.set(
      item.key,
      item.value,
      'EX',
      CACHE_TTL
    ))
  )
}
```

#### Cache validieren
```typescript
// src/lib/cache/validate.ts
export async function validateCache(): Promise<ValidationResult> {
  const sample = await getSampleData()
  const results = await Promise.all(
    sample.map(async item => {
      const cached = await redis.get(item.key)
      return {
        key: item.key,
        valid: cached === item.expectedValue
      }
    })
  )
  
  return {
    valid: results.every(r => r.valid),
    invalidKeys: results
      .filter(r => !r.valid)
      .map(r => r.key)
  }
}
```

### 4.3 Vektor-Recovery

#### Index neu aufbauen
```typescript
// src/lib/services/vectorizer/rebuild.ts
export async function rebuildVectorIndex(): Promise<void> {
  // Delete existing index
  await pinecone.deleteIndex()
  
  // Create new index
  await pinecone.createIndex({
    dimension: 1536,
    metric: 'cosine'
  })
  
  // Load all documents
  const documents = await loadAllDocuments()
  
  // Vectorize in batches
  for (const batch of chunks(documents, 100)) {
    const vectors = await Promise.all(
      batch.map(doc => vectorizer.vectorize(doc))
    )
    
    await pinecone.upsert({
      vectors,
      namespace: 'default'
    })
  }
}
```

#### Vektor-Validierung
```typescript
// src/lib/services/vectorizer/validate.ts
export async function validateVectors(): Promise<ValidationResult> {
  const testQueries = await loadTestQueries()
  const results = await Promise.all(
    testQueries.map(async query => {
      const results = await search(query.text)
      return {
        query: query.text,
        valid: validateResults(results, query.expectedResults)
      }
    })
  )
  
  return {
    valid: results.every(r => r.valid),
    failedQueries: results
      .filter(r => !r.valid)
      .map(r => r.query)
  }
}
```

## 5. Präventive Maßnahmen

### 5.1 Monitoring-Setup

#### System-Monitoring
```typescript
// src/lib/monitoring/system.ts
export const SYSTEM_MONITORS = [
  {
    name: 'memory',
    interval: '1m',
    threshold: 0.9,
    action: async () => {
      await gcCollect()
      await notifyTeam('High memory usage detected')
    }
  },
  {
    name: 'errors',
    interval: '5m',
    threshold: 10,
    action: async () => {
      await restartService()
      await notifyTeam('High error rate detected')
    }
  }
]
```

#### Performance-Monitoring
```typescript
// src/lib/monitoring/performance.ts
export const PERFORMANCE_MONITORS = [
  {
    name: 'response_time',
    interval: '1m',
    threshold: 1000,
    action: async () => {
      await optimizeQueries()
      await clearCache()
    }
  },
  {
    name: 'search_latency',
    interval: '5m',
    threshold: 500,
    action: async () => {
      await optimizeVectors()
      await warmupCache()
    }
  }
]
```

### 5.2 Automatische Recovery

#### Auto-Healing
```typescript
// src/lib/recovery/auto-heal.ts
export class AutoHealer {
  async monitor(): Promise<void> {
    // Check system health
    const health = await checkHealth()
    
    if (!health.healthy) {
      // Attempt recovery
      await this.recover(health.issues)
      
      // Verify recovery
      const verification = await verifyRecovery()
      
      if (!verification.successful) {
        // Notify team if recovery failed
        await notifyTeam(verification.errors)
      }
    }
  }
}
```

#### Failover-Strategien
```typescript
// src/lib/recovery/failover.ts
export const FAILOVER_STRATEGIES = {
  database: async () => {
    await switchToReplicaDB()
    await redirectTraffic()
    await notifyTeam('Database failover initiated')
  },
  cache: async () => {
    await switchToBackupCache()
    await rebuildCache()
    await notifyTeam('Cache failover initiated')
  },
  search: async () => {
    await switchToFallbackSearch()
    await reindexVectors()
    await notifyTeam('Search failover initiated')
  }
}
``` 