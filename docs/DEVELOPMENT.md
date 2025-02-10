# Dialog Engine – Entwicklungsdokumentation

## 1. Projektüberblick

Die Dialog Engine ist eine innovative Konversationsplattform, die Website-Inhalte durch kontextbewusstes Dialog-Management zugänglich macht. Das System kombiniert spezialisierte Content-Handler mit Smart Search für präzise, prozessorientierte Antworten.

- **Zielgruppe**: 
  - Primär: AOK-Mitglieder und Interessenten
  - Sekundär: Website-Betreiber mit komplexen Informationsstrukturen
- **Hauptfunktionen**:
  1. Spezialisierte Content-Handler für AOK-spezifische Themen
  2. Prozessorientiertes Dialog-Management
  3. Smart Search als Fallback-Mechanismus
  4. Kontextbewusstes Response-System

---

## 2. Systemarchitektur

### 2.1 Technologie-Stack
- **Frontend**: Next.js 14 mit TypeScript
- **Backend**: Next.js API Routes (TypeScript)
- **Datenbank**: PostgreSQL (via Prisma ORM)
- **Cache**: Redis
- **Vektorsuche**: Pinecone
- **KI-Integration**: OpenAI (Embeddings & Completions)
- **Styling**: Tailwind CSS

### 2.2 Hauptkomponenten
1. **Handler-System**
   - Spezialisierte AOK-Handler
   - Handler-Manager
   - Kontext-Management

2. **Dialog-System**
   - Prozess-Tracking
   - Kontext-Verwaltung
   - Interaktive Elemente

3. **Smart Search**
   - Vektorbasierte Suche
   - Content-Aggregation
   - Fallback-Mechanismus

---

## 3. Aktueller Status

### 3.1 Funktioniert
- ✅ Basis-Handler-Struktur
- ✅ AOK-spezifische Handler
- ✅ Handler-Manager
- ✅ Smart Search Integration
- ✅ Basis-Kontext-Management
- ✅ Response-Formatierung

### 3.2 Bekannte Probleme
- ❌ Prozess-Tracking noch nicht vollständig
- ❌ Kontext-Persistenz instabil
- ❌ Ressourcen-Verwaltung unvollständig
- ❌ Metadaten-Extraktion lückenhaft

### 3.3 In Entwicklung
- 🔄 Optimierung der Handler-Architektur
- 🔄 Verbesserung der Kontext-Verwaltung
- 🔄 Ausbau der Prozessunterstützung
- 🔄 Integration interaktiver Elemente

## 3. Daten-Import und Verarbeitung

### 3.1 Crawling-Workflow
1. **Firecrawl-Integration**
   - Crawling der Website über Firecrawl
   - Generierung von strukturierten Markdown-Dateien
   - Speicherung im `data/scans` Verzeichnis

2. **Verarbeitung**
   - `WebsiteScanner` verarbeitet Markdown-Dateien
   - Extraktion von Struktur und Metadaten
   - Vorbereitung für Vektorisierung

3. **Vektorisierung & Speicherung**
   - Umwandlung in Vektoren via OpenAI
   - Speicherung in Pinecone mit Template-ID
   - Caching relevanter Informationen

### 3.2 Daten-Zugriff
- Smart Search greift über Template-ID auf Vektoren zu
- Spezialisierte Handler für AOK-spezifische Themen
- Fallback auf allgemeine Vektorsuche

---

## 4. Handler-Entwicklung

### 4.1 Handler-Struktur
```typescript
abstract class BaseHandler {
  abstract canHandle(query: string): boolean;
  abstract getResponse(query: string, context: Context): Promise<Response>;
  
  protected updateContext(context: Context, response: Response): Context {
    // Basis-Implementierung
    return context;
  }
}
```

### 4.2 Handler-Implementierung
```typescript
class DentalHandler extends BaseHandler {
  canHandle(query: string): boolean {
    // Implementierung der Erkennungslogik
    return false;
  }

  async getResponse(query: string, context: Context): Promise<Response> {
    // Implementierung der Antwortlogik
    return {
      answer: "",
      metadata: {}
    };
  }
}
```

### 4.3 Handler-Tests
```typescript
describe('DentalHandler', () => {
  it('should handle dental related queries', () => {
    const handler = new DentalHandler();
    expect(handler.canHandle('Zahnreinigung')).toBe(true);
  });

  it('should provide correct metadata', async () => {
    const handler = new DentalHandler();
    const response = await handler.getResponse('Zahnreinigung', {});
    expect(response.metadata).toHaveProperty('costs');
  });
});
```

---

## 5. Entwicklungs-Guidelines

### 5.1 Handler-Entwicklung
- Strikte Typ-Definitionen
- Umfassende Tests
- Dokumentierte Methoden
- Klare Verantwortlichkeiten

### 5.2 Kontext-Management
- Minimale Kontext-Größe
- Klare Kontext-Updates
- Dokumentierte Seiteneffekte
- Typ-sichere Implementierung

### 5.3 Response-Generierung
- Quellenbasierte Antworten
- Strukturierte Metadaten
- Validierte Ressourcen
- Prozess-Konformität

---

## 6. Testing-Strategie

### 6.1 Unit Tests
- Handler-Logik
- Kontext-Management
- Response-Formatierung
- Utility-Funktionen

### 6.2 Integration Tests
- Handler-Interaktion
- Kontext-Persistenz
- Smart Search Integration
- Prozess-Flows

### 6.3 E2E Tests
- Dialog-Flows
- Prozess-Navigation
- Ressourcen-Einbindung
- Fehlerszenarien

---

## 7. Debugging-Tipps

### 7.1 Handler-Probleme
- Logging aktivieren
- Kontext überprüfen
- Metadaten validieren
- Tests ausführen

### 7.2 Kontext-Probleme
- Redis-Status prüfen
- Kontext-Größe überwachen
- Update-Logik testen
- Typ-Definitionen prüfen

### 7.3 Smart Search
- Pinecone-Status
- Query-Validierung
- Relevanz-Scoring
- Cache-Status

---

## 8. Nützliche Befehle

### 8.1 Entwicklung
```bash
# Development Server
npm run dev

# Type Check
npm run type-check

# Linting
npm run lint
```

### 8.2 Testing
```bash
# Unit Tests
npm run test

# Integration Tests
npm run test:integration

# E2E Tests
npm run test:e2e
```

### 8.3 Deployment
```bash
# Build
npm run build

# Type Check & Build
npm run build:full

# Deploy
npm run deploy
```

---

## 9. Weitere Dokumentation

Siehe auch:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detaillierte Systemarchitektur
- [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) - Projektübersicht & Ziele
- [HANDLERS.md](./HANDLERS.md) - Handler-Dokumentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment-Prozess