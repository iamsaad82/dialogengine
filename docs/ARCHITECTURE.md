# Dialog Engine - Architektur

## 1. Architektur-Überblick

Die Dialog Engine basiert auf einer mehrschichtigen Architektur, die spezialisierte Handler mit einer flexiblen Fallback-Strategie kombiniert:

```
┌─────────────────────────────────────┐
│            Dialog Widget            │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│          Dialog Controller          │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│         AOK Handler Manager         │
├─────────────────┬───────────────────┤
│  ┌─────────────────────────────┐    │
│  │     Specialized Handlers    │    │
│  ├─────────────┬──────────────┤    │
│  │ DentalHandler│TherapyHandler│    │
│  │ VisionHandler│SportsHandler │    │
│  └─────────────┴──────────────┘    │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│         Smart Search Layer          │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│        Content Repository           │
└─────────────────────────────────────┘
```

## 2. Komponenten

### 2.1 Dialog Widget
- **Verantwortlichkeit**: Frontend-Integration und UI
- **Funktionen**:
  - Benutzerinteraktion
  - Antwortdarstellung
  - Kontext-Verwaltung im Frontend

### 2.2 Dialog Controller
- **Verantwortlichkeit**: Request-Verarbeitung
- **Funktionen**:
  - Session-Management
  - Request-Routing
  - Response-Formatierung

### 2.3 AOK Handler Manager
- **Verantwortlichkeit**: Handler-Koordination
- **Funktionen**:
  - Handler-Auswahl
  - Fallback-Management
  - Qualitätssicherung

### 2.4 Specialized Handlers
- **Verantwortlichkeit**: Domänenspezifische Logik
- **Handler-Typen**:
  - DentalHandler (Zahngesundheit)
  - TherapyHandler (Therapien)
  - PreventionHandler (Vorsorge)
  - MedicalTreatmentHandler (Behandlungen)
  - RehabilitationHandler (Reha)
  - FamilyHandler (Familie)
  - VisionHearingHandler (Sehen & Hören)
  - SportsHandler (Sport)
  - NutritionHandler (Ernährung)

### 2.5 Smart Search Layer
- **Verantwortlichkeit**: Fallback-Suche
- **Funktionen**:
  - Vektorbasierte Suche
  - Relevanz-Scoring
  - Content-Aggregation

### 2.6 Content Repository
- **Verantwortlichkeit**: Datenhaltung
- **Komponenten**:
  - Website-Content
  - Metadaten
  - Prozess-Definitionen

## 3. Datenfluss

### 3.1 Request-Verarbeitung
1. Benutzeranfrage → Dialog Widget
2. Dialog Controller → Request-Analyse
3. Handler Manager → Handler-Auswahl
4. Spezialisierter Handler oder Smart Search
5. Antwortgenerierung und Formatierung
6. Response → Dialog Widget

### 3.2 Kontext-Management
- **Session Context**:
  - Aktuelle Prozessphase
  - Vorherige Interaktionen
  - Benutzervorlieben
- **Content Context**:
  - Relevante Ressourcen
  - Verknüpfte Prozesse
  - Metadaten

### 3.3 Fallback-Strategie
1. Handler-Versuch
2. Bei Nicht-Match → Smart Search
3. Antwort-Validierung
4. Qualitätssicherung
5. Response-Generierung

## 4. Technische Details

### 4.1 Handler-Implementierung
```typescript
interface BaseHandler {
  canHandle(query: string): boolean;
  getResponse(query: string, context: Context): Promise<Response>;
  updateContext(context: Context, response: Response): Context;
}

interface Response {
  answer: string;
  metadata: {
    nextSteps?: string[];
    requirements?: string[];
    costs?: string[];
    contacts?: Contact[];
    relatedTopics?: string[];
  };
}
```

### 4.2 Context Management
```typescript
interface Context {
  sessionId: string;
  currentProcess?: string;
  processStep?: string;
  history: Interaction[];
  metadata: Map<string, any>;
}
```

### 4.3 Content Structure
```typescript
interface Content {
  id: string;
  type: ContentType;
  title: string;
  content: string;
  metadata: ContentMetadata;
  resources: Resource[];
}

interface ContentMetadata {
  process?: string;
  requirements?: string[];
  costs?: string[];
  contacts?: Contact[];
}
```

## 5. Qualitätssicherung

### 5.1 Response-Validierung
- Quellenüberprüfung
- Metadaten-Validierung
- Kontext-Konsistenz

### 5.2 Performance-Metriken
- Handler-Response-Zeit
- Fallback-Rate
- Cache-Hit-Rate
- Kontext-Switch-Zeit

### 5.3 Monitoring
- Handler-Performance
- Fallback-Qualität
- Kontext-Stabilität
- Ressourcen-Verfügbarkeit

## 6. Erweiterbarkeit

### 6.1 Neue Handler
- Handler-Interface implementieren
- Spezialisierte Logik hinzufügen
- Tests erstellen
- In Manager registrieren

### 6.2 Content-Erweiterungen
- Neue Content-Typen
- Zusätzliche Metadaten
- Erweiterte Ressourcen
- Prozess-Definitionen

### 6.3 Integrationen
- Externe Systeme
- APIs
- Datenquellen
- Analyse-Tools 