# Dialog Engine

Eine innovative Konversationsplattform, die Website-Inhalte durch kontextbewusstes Dialog-Management zugänglich macht. Das System kombiniert spezialisierte Content-Handler mit Smart Search für präzise, prozessorientierte Antworten.

## Features

- 🤖 **Spezialisierte Content-Handler**
  - AOK-spezifische Handler für verschiedene Gesundheitsbereiche
  - Prozessorientierte Antwortgenerierung
  - Kontextbewusstes Dialog-Management
- 🔍 **Smart Search Integration**
  - Vektorbasierte Semantische Suche
  - Hybride Antwortgenerierung
  - Quellenbasierte Validierung
- 🎯 **Prozessorientierung**
  - Kontexterhaltung über Konversationen
  - Proaktive Hilfestellung
  - Interaktive Ressourcen-Einbindung
- 📊 **Content Management**
  - Automatische Content-Extraktion
  - Metadaten-Management
  - Strukturierte Antwortgenerierung
- 🛠️ **Admin Interface**
  - Template-Management
  - Content-Scanning
  - Performance-Monitoring
- 🔒 **Sicherheit & Compliance**
  - DSGVO-konform
  - Sichere API-Integration
  - Zugriffskontrollen

## Technologie-Stack

### Frontend
- **Framework**: Next.js 14, React 18
- **Sprache**: TypeScript 5
- **Styling**: Tailwind CSS, shadcn/ui
- **State Management**: React Context, Zustand

### Backend
- **Server**: Next.js API Routes
- **Datenbank**: PostgreSQL mit Prisma ORM
- **Caching**: Redis
- **Vektorsuche**: Pinecone
- **KI-Integration**: OpenAI, Anthropic

### Infrastruktur
- **Deployment**: Vercel
- **Monitoring**: Vercel Analytics
- **CI/CD**: GitHub Actions
- **Container**: Docker

## Erste Schritte

### 1. Repository klonen
```bash
git clone https://github.com/yourusername/dialog-engine.git
cd dialog-engine
```

### 2. Abhängigkeiten installieren
```bash
npm install
```

### 3. Umgebungsvariablen konfigurieren
```bash
cp .env.example .env.local
# Fügen Sie Ihre Umgebungsvariablen in .env.local ein
```

### 4. Datenbank einrichten
```bash
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

### 5. Entwicklungsserver starten
```bash
npm run dev
```

Die Anwendung ist nun unter [http://localhost:3000](http://localhost:3000) verfügbar.

## Erforderliche Umgebungsvariablen

```env
# Datenbank
DATABASE_URL="postgres://..."

# NextAuth
NEXTAUTH_URL="https://ihre-domain.vercel.app"
NEXTAUTH_SECRET="ein-sicherer-secret-key"

# OpenAI (für Smart Search)
OPENAI_API_KEY=""

# Anthropic (für Claude)
ANTHROPIC_API_KEY=""

# Redis (für Caching)
REDIS_URL="redis://..."
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Default Template
DEFAULT_TEMPLATE_ID="default"

# Pinecone (für Vektorsuche)
PINECONE_API_KEY=""
PINECONE_ENVIRONMENT="gcp-europe-west4-de1d"
PINECONE_INDEX="dialog-engine"

# Firecrawl
FIRECRAWL_API_KEY=""
```

## Dokumentation

- [Entwicklung](docs/DEVELOPMENT.md)
- [Architektur](docs/ARCHITECTURE.md)
- [Services](docs/SERVICES.md)
- [Handler](docs/HANDLERS.md)
- [API](docs/API.md)
- [Testing](docs/TESTING.md)
- [Security](docs/SECURITY.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Lizenz

Dieses Projekt ist proprietär und darf nur mit ausdrücklicher Genehmigung verwendet werden.
