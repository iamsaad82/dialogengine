# Services Dokumentation

## ContentVectorizer

Der `ContentVectorizer` ist verantwortlich für die Vektorisierung und Indexierung von Inhalten.

### Konfiguration

```typescript
interface VectorizerConfig {
  openaiApiKey: string;
  pineconeApiKey: string;
  pineconeEnvironment: string;
  pineconeIndex: string;
  pineconeHost?: string;
}
```

### Status
- ✅ Basis-Funktionalität implementiert
- ✅ OpenAI Integration
- ✅ Pinecone Anbindung
- ❌ Fehlerfreie Vektorisierung
- ❌ Vollständiges Metadata-Handling

### Bekannte Probleme
- Fehlende Metadatenfelder (text)
- "Must pass in at least 1 record to upsert" Fehler
- Unvollständige Markdown-Verarbeitung

## WebsiteScanner

Der `WebsiteScanner` verarbeitet Markdown-Dateien aus dem Firecrawl-Output und bereitet sie für die Vektorisierung vor.

### Hauptfunktionen
- Markdown-Datei-Verarbeitung
- Struktur- und Prozesserkennung
- Metadaten-Extraktion
- Vektorisierungsvorbereitung

### Workflow
1. **Input**
   - Markdown-Dateien aus Firecrawl im `data/scans` Verzeichnis
   - Strukturierte Inhalte mit Überschriften-Hierarchie
   - Meta-Informationen und Links

2. **Verarbeitung**
   - Extraktion von Prozess-Informationen
   - Erkennung von Kontext-Beziehungen
   - Analyse von Interaktionsmöglichkeiten
   - Aufbereitung der Metadaten

3. **Output**
   - Vektorisierte Inhalte in Pinecone
   - Template-ID-Zuordnung
   - Strukturierte Metadaten
   - Cache-Einträge für häufige Anfragen

### Status
- ✅ Markdown-Verarbeitung
- ✅ Struktur-Extraktion
- ✅ Metadaten-Handling
- ✅ Vektorisierungs-Pipeline
- ❌ Vollständige Prozesserkennung
- ❌ Interaktions-Analyse

## ContentProcessor

Der `ContentProcessor` verarbeitet und klassifiziert extrahierte Inhalte.

### Content-Typen
- `INFO`: Allgemeine Informationen
- `SERVICE`: Dienstleistungsbeschreibungen
- `PRODUCT`: Produktinformationen
- `EVENT`: Veranstaltungen
- `LOCATION`: Standorte
- `VIDEO`: Video-Content
- `LINK`: Verweise
- `CONTACT`: Kontaktinformationen
- `FAQ`: Häufig gestellte Fragen
- `DOWNLOAD`: Downloads
- `ERROR`: Fehlerseiten

### Metadaten-Extraktion
Für jeden Content-Typ werden spezifische Metadaten extrahiert:

```typescript
interface ContentMetadata {
  title?: string;
  description?: string;
  url?: string;
  type: ContentType;
  text: string;
  contentType?: string;
  language?: string;
  lastModified?: string;
  sectionLevel?: number;
  sectionIndex?: number;
  totalSections?: number;
  hasActions?: boolean;
  hasRequirements?: boolean;
  hasDeadlines?: boolean;
  hasContactPoints?: boolean;
}
```

### Status
- ✅ Content-Typ-Erkennung
- ✅ Basis-Metadaten-Extraktion
- ❌ Vollständige Metadaten-Validierung
- ❌ Robuste Fehlerbehandlung

## VectorStorage

Der `VectorStorage` verwaltet die Vektorisierung und Speicherung von Inhalten in Pinecone.

### Hauptfunktionen
- Vektorisierung von Texten
- Ähnlichkeitssuche
- Metadaten-Verwaltung
- Query-Interface

### Status
- ✅ Pinecone-Integration
- ✅ Vektorisierung (OpenAI)
- ❌ Zuverlässige Upserts
- ❌ Fehlerfreies Metadata-Handling

### Bekannte Probleme
- Upsert-Fehler bei fehlenden Metadaten
- Inkonsistente Vektorisierung
- Unvollständige Fehlerbehandlung

## SmartSearchHandler

Der `SmartSearchHandler` orchestriert die Suche und Antwortgenerierung.

### Status
- ✅ Basis-Suchfunktionalität
- ✅ OpenAI Integration
- ❌ Kontextrelevante Antworten
- ❌ Performance-Optimierung

## Redis Client

Der `RedisClient` verwaltet Caching und Job-Status-Tracking.

### Status
- ✅ Basis-Funktionalität
- ❌ Stabile Verbindung
- ❌ Zuverlässiges Job-Tracking

### Bekannte Probleme
- Verbindungs-Timeouts
- Unzuverlässiges Status-Tracking

## Erforderliche Umgebungsvariablen
- `REDIS_URL`
- `PINECONE_API_KEY`
- `PINECONE_ENVIRONMENT`
- `PINECONE_INDEX`
- `OPENAI_API_KEY`
- `FIRECRAWL_API_KEY`

## Integration Tests

Die System-Integration-Tests prüfen das Zusammenspiel aller Komponenten:

1. Crawling-Prozess
2. Content-Verarbeitung
3. Vektorisierung
4. Antwortgenerierung

### Test-Konfiguration

Erforderliche Umgebungsvariablen:
- `REDIS_URL`
- `PINECONE_API_KEY`
- `PINECONE_ENVIRONMENT`
- `PINECONE_INDEX`
- `OPENAI_API_KEY`
- `FIRECRAWL_API_KEY`
- `TEST_TEMPLATE_ID`

### Testfälle

- Vollständiger E2E-Test
- Content-Typ-Erkennung
- Metadaten-Extraktion
- Query-Verarbeitung
- Antwortqualität 