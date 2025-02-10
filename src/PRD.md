# Dialog-AI-Web PRD (Stand: 24.01.2024)

## 1. Produktübersicht
Dialog-AI-Web ist eine flexible Chatbot-Lösung, die sich einfach für verschiedene Branchen und Kunden anpassen lässt. Das System besteht aus einer neutralen Basis-Version und branchenspezifischen Varianten.

## 2. Projektstruktur
```
dialog-engine/               # Root-Verzeichnis
├── src/                    # Source Code
│   ├── app/               # Next.js App Router
│   │   ├── admin/        # Admin Interface
│   │   ├── api/          # API Routes
│   │   └── [subdomain]/  # Dynamic Routes
│   ├── components/        # React Komponenten
│   │   ├── admin/        # Admin Components
│   │   ├── ui/           # UI Components
│   │   └── preview/      # Preview Components
│   ├── lib/              # Utilities und Bibliotheken
│   │   ├── schemas/      # Zod Schemas
│   │   ├── types/        # TypeScript Types
│   │   └── prisma.ts     # Prisma Client
│   └── types/            # Global Types
├── prisma/                # Prisma Konfiguration
│   ├── schema.prisma     # Datenbankschema
│   └── seed.ts           # Seed-Skripte
├── public/               # Statische Dateien
└── .env                  # Umgebungsvariablen
```

## 3. Systemarchitektur

### 3.1 Domain-Struktur
- Dynamische Subdomains: [kunde].dialog-ai-web.de
- Jede Subdomain lädt ein spezifisches Template

### 3.2 Komponenten
1. Template System
   - PostgreSQL Datenbank mit Prisma ORM
   - JSON-basierte Template-Speicherung
   - Dynamisches Subdomain-Routing
   - Zod Schema Validierung

2. Chat Interface
   - Dialog Mode mit zwei Bot-Typen:
     - Examples (Vordefinierten Antworten)
     - Flowise (KI-Integration)
   - Responsive Design
   - Animierte Übergänge
   - Typing Indicators

3. Admin Interface
   - Template Management
     - CRUD Operationen
     - Live Preview
     - JSON Validierung
   - Bot Configuration
     - Example Management
     - Flowise Integration
   - Asset Management
     - Bild Upload
     - URL Validierung

## 4. Datenmodelle

### 4.1 Template Schema
```typescript
interface Template {
  id: string;
  name: string;
  type: 'NEUTRAL' | 'INDUSTRY' | 'CUSTOM';
  active: boolean;
  subdomain: string;
  
  jsonContent: {
    hero: {
      title: string;
      subtitle: string;
      description: string;
    };
    showcase: {
      image: string;
      altText: string;
      context: {
        title: string;
        description: string;
      };
      cta: {
        title: string;
        question: string;
      };
    };
    features: Array<{
      icon: string;
      title: string;
      description: string;
    }>;
    contact: {
      title: string;
      description: string;
      email: string;
      buttonText: string;
    };
    dialog: {
      title: string;
      description: string;
    };
  };

  jsonBranding: {
    logo: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    font: string;
  };

  jsonBot: {
    type: 'examples' | 'flowise' | 'smart-search';
    examples?: Array<{
      question: string;
      answer: string;
      context?: string;
      type: ResponseType;
      metadata?: {
        url?: string;
        image?: string;
        price?: string;
        date?: string;
        time?: string;
        sessions?: string;
        available?: boolean;
        address?: string;
        buttonText?: string;
        videoUrl?: string;
        fileType?: string;
        fileSize?: string;
        relatedQuestions?: string[];
        title?: string;
      };
    }>;
    flowiseId?: string;
    smartSearch?: {
      provider: 'openai';
      urls: string[];
      excludePatterns: string[];
      chunkSize: number;
      temperature: number;
      reindexInterval: number;
      maxTokensPerRequest: number;
      maxPages: number;
      useCache: boolean;
      similarityThreshold: number;
      apiKey: string;
      indexName: string;
      apiEndpoint: string;
    };
  };

  jsonMeta: {
    title: string;
    description: string;
    keywords: string[];
  };
}
```

### 4.2 Response Types
- info: Allgemeine Informationen
- service: Dienstleistungen
- product: Produktinformationen
- event: Veranstaltungen
- location: Standorte/Adressen
- video: Video-Content
- link: Weiterführende Links
- contact: Kontaktinformationen
- faq: Häufig gestellte Fragen
- download: Download-Ressourcen

## 5. Komponenten-System

### 5.1 Haupt-Komponenten
- ChatbotLandingPage: Container für alle Sektionen
- DialogMode: Chat-Interface mit Bot-Integration
- Features: Feature-Grid mit Icons
- Showcase: Hauptbild mit Kontext
- CallToAction: CTA mit Dialog-Switcher
- DialogHeadline: Dynamische Überschriften
- TypingIndicator: Animierte Lade-Anzeige

### 5.2 Admin-Komponenten
- TemplateManager: Template-Übersicht und CRUD
- SettingsEditor: Grundeinstellungen
- ContentEditor: Content-Management
- BotEditor: Bot-Konfiguration
  - ExamplesBot: Beispielantworten
  - FlowiseBot: Flowise-Integration
  - SmartSearchBot: KI-gestützte Suche
- BrandingEditor: Design-Anpassungen
- SchemaEditor: Schema-Definition
- MetadataEditor: Meta-Informationen
- AnalyticsEditor: Nutzungsstatistiken

## 6. Styling-System

### 6.1 Design-Tokens
- Typografie:
  - Font-Stack:
    - Primär: Inter (UI Text)
    - Sekundär: Geist Sans (Überschriften)
    - Fallback: system-ui, sans-serif
  
  - Schriftgrößen & Zeilenhöhen:
    - Hero:
      - Titel: text-5xl/tight (3rem)
      - Untertitel: text-3xl/snug (1.875rem)
      - Beschreibung: text-lg/relaxed (1.125rem)
    
    - Showcase:
      - Titel: text-4xl/tight (2.25rem)
      - Beschreibung: text-lg/relaxed (1.125rem)
      - CTA: text-xl/relaxed (1.25rem)
    
    - Features:
      - Titel: text-xl/snug (1.25rem)
      - Beschreibung: text-base/normal (1rem)
    
    - Call-to-Action:
      - Titel: text-2xl/snug (1.5rem)
      - Beschreibung: text-lg/relaxed (1.125rem)
      - Button: text-base/medium (1rem)
    
    - Dialog Mode:
      - Nachrichten: text-base/normal (1rem)
      - Input: text-base/normal (1rem)
      - Buttons: text-sm/medium (0.875rem)
  
  - Schriftstärken:
    - Überschriften: font-bold (700)
    - Untertitel: font-semibold (600)
    - Text: font-normal (400)
    - Buttons: font-medium (500)

  - Responsive Anpassungen:
    - Mobile: Basis-Größen -1 Stufe
    - Tablet: Basis-Größen
    - Desktop: Basis-Größen

- Farben:
  - Primärfarbe (Konfiguierbar)
  - Sekundärfarbe (Konfiguierbar)
  - Graustufen für Text
  - Weiß für Hintergründe

- Abstände:
  - Container: max-w-3xl
  - Padding: p-4 sm:p-6 lg:p-8
  - Gaps: space-y-4 sm:space-y-6

- Animationen:
  - Framer Motion für Übergänge
  - Hover-Effekte
  - Loading States

### 6.2 Responsive Design
- Mobile First Approach
- Flexible Grids
- Anpassungsfähige Typografie
- Optimierte Touch-Targets

## 7. Bot-System

### 7.1 Example-Bot
- Vordefinierte Fragen & Antworten
- Kontext-basierte Suche
- Fallback-Antworten
- Response-Type Handling
- Metadaten für strukturierte Antworten

### 7.2 Flowise-Bot
- Integration mit Flowise AI
- Konfigurierbare Flows
- API-Key Management
- Response Rules

### 7.3 Smart Search Bot
- KI-gestützte Suche mit OpenAI
- Vektorbasierte Ähnlichkeitssuche (Pinecone)
- Automatisches Crawling von Websites
- Intelligente Chunk-Extraktion
- Cache-System für schnelle Antworten
- Konfigurierbare Ausschlussmuster
- Automatische Reindexierung

## 8. Sicherheit & Performance

### 8.1 Sicherheit
- Input Validierung mit Zod
- SQL Injection Prevention durch Prisma
- XSS Protection
- CORS Konfiguration

### 8.2 Performance
- JSON Parsing Optimierung
- Lazy Loading für Bilder
- Optimierte Bot-Antwortzeiten
- Caching Strategien

## 9. Aktuelle Implementierung

### 9.1 Abgeschlossen
- [x] Template System mit PostgreSQL
- [x] Dynamisches Routing
- [x] Bot Integration (Examples/Flowise)
- [x] Admin Interface Basis
- [x] Content Management
- [x] Response Types
- [x] Styling System

### 9.2 In Entwicklung
- [ ] Asset Management
- [ ] Analytics Dashboard
- [ ] Multi-Language Support
- [ ] Advanced Caching
- [ ] Error Tracking
- [ ] Performance Monitoring

## 10. Wartung & Updates

### 10.1 Regelmäßige Tasks
- Dependency Updates
- Security Patches
- Performance Optimierungen
- Bot-Verbesserungen

### 10.2 Monitoring
- Error Logging
- Performance Metrics
- Bot Analytics
- User Feedback 