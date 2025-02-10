# Dialog Engine - Deployment-Dokumentation

## 1. Deployment-Übersicht

Die Dialog Engine wird als containerisierte Anwendung auf Vercel deployed, mit zusätzlichen Services auf verschiedenen Cloud-Plattformen.

### 1.1 Komponenten

1. **Frontend & API**
   - Next.js Application
   - Vercel Platform
   - Edge Functions

2. **Datenbank**
   - PostgreSQL
   - Vercel Postgres

3. **Cache & Jobs**
   - Redis
   - Upstash

4. **Vektorsuche**
   - Pinecone
   - Dedicated Index

5. **KI-Services**
   - OpenAI API
   - Anthropic API

## 2. Voraussetzungen

### 2.1 Accounts & Zugänge

- Vercel Account
- GitHub Account
- Pinecone Account
- OpenAI Account
- Upstash Account

### 2.2 Umgebungsvariablen

```env
# Datenbank
DATABASE_URL="postgres://..."

# NextAuth
NEXTAUTH_URL="https://ihre-domain.vercel.app"
NEXTAUTH_SECRET="ein-sicherer-secret-key"

# OpenAI
OPENAI_API_KEY=""

# Anthropic
ANTHROPIC_API_KEY=""

# Redis
REDIS_URL="redis://..."
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Default Template
DEFAULT_TEMPLATE_ID="default"

# Pinecone
PINECONE_API_KEY=""
PINECONE_ENVIRONMENT="gcp-europe-west4-de1d"
PINECONE_INDEX="dialog-engine"

# Firecrawl
FIRECRAWL_API_KEY=""
```

## 3. Deployment-Prozess

### 3.1 Lokale Vorbereitung

```bash
# Repository klonen
git clone https://github.com/yourusername/dialog-engine.git
cd dialog-engine

# Dependencies installieren
npm install

# Build testen
npm run build

# Typecheck
npm run type-check

# Tests
npm run test
```

### 3.2 Vercel Deployment

1. **Projekt auf Vercel importieren**
   ```bash
   vercel login
   vercel link
   vercel env pull .env.local
   ```

2. **Umgebungsvariablen setzen**
   ```bash
   vercel env add DATABASE_URL
   vercel env add NEXTAUTH_SECRET
   # ... weitere Variablen
   ```

3. **Deployment starten**
   ```bash
   vercel deploy --prod
   ```

### 3.3 Datenbank-Migration

```bash
# Prisma Schema generieren
npm run prisma:generate

# Migration erstellen
npm run prisma:migrate:dev

# Migration auf Produktion anwenden
npm run prisma:migrate:deploy
```

### 3.4 Redis Setup

```bash
# Redis Verbindung testen
npm run test:redis

# Jobs Queue initialisieren
npm run init:queue
```

### 3.5 Pinecone Setup

```bash
# Index erstellen
npm run pinecone:create-index

# Index konfigurieren
npm run pinecone:configure

# Initiale Vektorisierung
npm run vectorize:all
```

## 4. Deployment-Konfiguration

### 4.1 Vercel Konfiguration

```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1",
      "headers": {
        "x-frame-options": "DENY",
        "x-content-type-options": "nosniff",
        "x-xss-protection": "1; mode=block"
      }
    }
  ]
}
```

### 4.2 Docker Konfiguration

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
CMD ["node", "server.js"]
```

### 4.3 Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  postgres:
    image: postgres:14-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

## 5. Monitoring & Logging

### 5.1 Vercel Analytics

```typescript
// next.config.js
module.exports = {
  analyticsId: process.env.VERCEL_ANALYTICS_ID,
}
```

### 5.2 Error Tracking

```typescript
// src/lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
})
```

### 5.3 Performance Monitoring

```typescript
// src/lib/monitoring/performance.ts
export class PerformanceMonitor {
  async trackMetric(metric: Metric): Promise<void> {
    await prisma.performanceMetric.create({
      data: {
        name: metric.name,
        value: metric.value,
        timestamp: new Date(),
        metadata: metric.metadata
      }
    })
  }

  async getMetrics(
    name: string,
    timeframe: TimeFrame
  ): Promise<Metric[]> {
    return await prisma.performanceMetric.findMany({
      where: {
        name,
        timestamp: {
          gte: timeframe.start,
          lte: timeframe.end
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    })
  }
}
```

## 6. Backup & Recovery

### 6.1 Datenbank-Backup

```bash
#!/bin/bash
# backup.sh

# Backup erstellen
pg_dump $DATABASE_URL > backup.sql

# Backup verschlüsseln
gpg --encrypt --recipient $GPG_KEY backup.sql

# Backup hochladen
aws s3 cp backup.sql.gpg s3://$BACKUP_BUCKET/$(date +%Y-%m-%d)/
```

### 6.2 Recovery-Prozedur

```bash
#!/bin/bash
# restore.sh

# Backup herunterladen
aws s3 cp s3://$BACKUP_BUCKET/$BACKUP_DATE/backup.sql.gpg .

# Backup entschlüsseln
gpg --decrypt backup.sql.gpg > backup.sql

# Datenbank wiederherstellen
psql $DATABASE_URL < backup.sql
```

## 7. Deployment-Checkliste

### 7.1 Pre-Deployment
- [ ] Tests erfolgreich
- [ ] Build erfolgreich
- [ ] Umgebungsvariablen gesetzt
- [ ] Datenbank-Migrations geplant
- [ ] Backup erstellt

### 7.2 Deployment
- [ ] Code deployt
- [ ] Migrationen ausgeführt
- [ ] Services gestartet
- [ ] Monitoring aktiviert
- [ ] SSL/TLS aktiv

### 7.3 Post-Deployment
- [ ] Health Checks erfolgreich
- [ ] Performance-Tests bestanden
- [ ] Logs überprüft
- [ ] Backups verifiziert
- [ ] Dokumentation aktualisiert

## 8. Rollback-Prozedur

### 8.1 Code-Rollback

```bash
# Zur letzten stabilen Version zurückkehren
git checkout $LAST_STABLE_TAG

# Deployment triggern
vercel deploy --prod
```

### 8.2 Datenbank-Rollback

```bash
# Migration rückgängig machen
npm run prisma:migrate:reset

# Backup einspielen
npm run db:restore $BACKUP_DATE
```

### 8.3 Service-Rollback

```bash
# Services neustarten
docker-compose down
docker-compose up -d

# Cache leeren
npm run cache:clear

# Vektoren neu indexieren
npm run vectorize:all
```

## 9. Wartung & Updates

### 9.1 Dependency-Updates

```bash
# Dependencies aktualisieren
npm update

# Sicherheits-Audit
npm audit

# Typecheck
npm run type-check

# Tests
npm run test
```

### 9.2 System-Updates

```bash
# Docker Images aktualisieren
docker-compose pull

# Services neustarten
docker-compose up -d

# Logs überprüfen
docker-compose logs -f
```

### 9.3 SSL-Zertifikate

```bash
# Zertifikate erneuern
certbot renew

# Nginx neustarten
systemctl restart nginx
```

## 10. Troubleshooting

### 10.1 Logs abrufen

```bash
# Vercel Logs
vercel logs

# Container Logs
docker-compose logs -f

# Datenbank Logs
heroku logs --tail -a your-db-instance
```

### 10.2 Health Checks

```bash
# API Status
curl https://api.dialog-engine.com/health

# Datenbank Status
npm run db:health

# Redis Status
npm run redis:health

# Pinecone Status
npm run pinecone:health
```

### 10.3 Performance-Probleme

```bash
# Performance Metriken
npm run metrics:show

# Langsame Queries
npm run db:slow-queries

# Cache Hit Rate
npm run cache:stats