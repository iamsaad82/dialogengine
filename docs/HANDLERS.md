# Dialog Engine - Handler-Dokumentation

## 1. Handler-Übersicht

Die Dialog Engine verwendet ein spezialisiertes Handler-System für die AOK-spezifische Verarbeitung von Benutzeranfragen. Jeder Handler ist für einen bestimmten Themenbereich zuständig und implementiert die Logik zur Erkennung und Beantwortung relevanter Fragen.

### 1.1 Verfügbare Handler

1. **DentalHandler**
   - Zahngesundheit und -behandlung
   - Prophylaxe und Vorsorge
   - Kostenübernahme

2. **TherapyHandler**
   - Physiotherapie
   - Ergotherapie
   - Psychotherapie

3. **PreventionHandler**
   - Vorsorgeuntersuchungen
   - Impfungen
   - Gesundheitskurse

4. **MedicalTreatmentHandler**
   - Ärztliche Behandlungen
   - Medikamente
   - Heilmittel

5. **RehabilitationHandler**
   - Reha-Maßnahmen
   - Antragsstellung
   - Nachsorge

6. **FamilyHandler**
   - Familienversicherung
   - Mutterschaft
   - Kindervorsorge

7. **VisionHearingHandler**
   - Sehhilfen
   - Hörgeräte
   - Vorsorgeuntersuchungen

8. **SportsHandler**
   - Präventionskurse
   - Sportmedizin
   - Fitness-Programme

9. **NutritionHandler**
   - Ernährungsberatung
   - Diätprogramme
   - Präventionskurse

## 2. Handler-Architektur

### 2.1 Basis-Handler
```typescript
abstract class BaseHandler {
  abstract canHandle(query: string): boolean;
  abstract getResponse(query: string, context: Context): Promise<Response>;
  
  protected updateContext(context: Context, response: Response): Context {
    return {
      ...context,
      lastHandler: this.constructor.name,
      lastQuery: query,
      lastResponse: response
    };
  }
  
  protected validateResponse(response: Response): boolean {
    return (
      response.answer &&
      response.metadata &&
      (!response.metadata.nextSteps || Array.isArray(response.metadata.nextSteps)) &&
      (!response.metadata.requirements || Array.isArray(response.metadata.requirements))
    );
  }
}
```

### 2.2 Handler-Manager
```typescript
class AOKHandlerManager {
  private handlers: BaseHandler[];
  private smartSearch: SmartSearch;

  constructor() {
    this.handlers = [
      new DentalHandler(),
      new TherapyHandler(),
      // ... weitere Handler
    ];
    this.smartSearch = new SmartSearch();
  }

  async handleQuery(query: string, context: Context): Promise<Response> {
    // Handler-Auswahl und Ausführung
    const handler = this.selectHandler(query);
    if (handler) {
      return await handler.getResponse(query, context);
    }
    
    // Fallback zu Smart Search
    return await this.smartSearch.search(query, context);
  }

  private selectHandler(query: string): BaseHandler | null {
    return this.handlers.find(handler => handler.canHandle(query)) || null;
  }
}
```

## 3. Handler-Implementierung

### 3.1 Beispiel: DentalHandler
```typescript
class DentalHandler extends BaseHandler {
  private keywords = [
    'zahn', 'zahnarzt', 'zahnreinigung', 'prophylaxe',
    'zahnersatz', 'implantate', 'krone', 'brücke'
  ];

  canHandle(query: string): boolean {
    return this.keywords.some(keyword => 
      query.toLowerCase().includes(keyword)
    );
  }

  async getResponse(query: string, context: Context): Promise<Response> {
    // Antwortgenerierung basierend auf Query und Kontext
    const response = {
      answer: "...",
      metadata: {
        nextSteps: ["Termin vereinbaren", "Kostenplan anfordern"],
        requirements: ["Versichertenkarte", "Überweisungsschein"],
        costs: ["Eigenanteil: 20%", "Festzuschuss möglich"],
        contacts: [{
          type: "Zahnarztsuche",
          url: "https://...",
          phone: "..."
        }]
      }
    };

    return response;
  }
}
```

### 3.2 Beispiel: TherapyHandler
```typescript
class TherapyHandler extends BaseHandler {
  private therapyTypes = new Map([
    ['physiotherapie', {
      requirements: ['Verordnung vom Arzt'],
      costs: ['10€ Zuzahlung pro Verordnung'],
      duration: '6 Behandlungen'
    }],
    ['ergotherapie', {
      requirements: ['Heilmittelverordnung'],
      costs: ['10€ Zuzahlung pro Verordnung'],
      duration: 'Nach Verordnung'
    }]
  ]);

  canHandle(query: string): boolean {
    return query.toLowerCase().includes('therapie');
  }

  async getResponse(query: string, context: Context): Promise<Response> {
    // Therapie-spezifische Antwortgenerierung
    return {
      answer: "...",
      metadata: {
        // Therapie-spezifische Metadaten
      }
    };
  }
}
```

## 4. Kontext-Management

### 4.1 Kontext-Struktur
```typescript
interface Context {
  sessionId: string;
  currentProcess?: string;
  processStep?: string;
  history: Interaction[];
  metadata: Map<string, any>;
}

interface Interaction {
  query: string;
  response: Response;
  timestamp: Date;
  handlerUsed: string;
}
```

### 4.2 Kontext-Updates
- Tracking des aktuellen Prozesses
- Speicherung relevanter Metadaten
- Historie der Interaktionen
- Handler-spezifische Informationen

## 5. Response-Struktur

### 5.1 Basis-Response
```typescript
interface Response {
  answer: string;
  metadata: ResponseMetadata;
}

interface ResponseMetadata {
  nextSteps?: string[];
  requirements?: string[];
  costs?: string[];
  contacts?: Contact[];
  relatedTopics?: string[];
}

interface Contact {
  type: string;
  name?: string;
  url?: string;
  phone?: string;
  email?: string;
  address?: string;
}
```

### 5.2 Handler-spezifische Erweiterungen
- Zusätzliche Metadaten je nach Kontext
- Prozess-spezifische Informationen
- Ressourcen-Verweise
- Interaktive Elemente

## 6. Best Practices

### 6.1 Handler-Entwicklung
1. **Klare Verantwortlichkeiten**
   - Ein Handler pro Themenbereich
   - Eindeutige Erkennungslogik
   - Spezifische Antwortgenerierung

2. **Robuste Implementierung**
   - Fehlerbehandlung
   - Validierung
   - Logging

3. **Wartbarkeit**
   - Dokumentation
   - Tests
   - Typ-Definitionen

### 6.2 Response-Generierung
1. **Qualitätssicherung**
   - Quellenbasiert
   - Strukturiert
   - Validiert

2. **Benutzerführung**
   - Klare nächste Schritte
   - Relevante Ressourcen
   - Kontextbezogene Hilfe

3. **Prozess-Orientierung**
   - Status-Tracking
   - Fortschrittsanzeige
   - Hilfestellung

## 7. Testing

### 7.1 Unit Tests
```typescript
describe('DentalHandler', () => {
  const handler = new DentalHandler();

  describe('canHandle', () => {
    it('should handle dental queries', () => {
      expect(handler.canHandle('Zahnreinigung')).toBe(true);
      expect(handler.canHandle('Implantate')).toBe(true);
    });

    it('should not handle non-dental queries', () => {
      expect(handler.canHandle('Physiotherapie')).toBe(false);
    });
  });

  describe('getResponse', () => {
    it('should provide valid metadata', async () => {
      const response = await handler.getResponse('Zahnreinigung', {});
      expect(response.metadata.nextSteps).toBeDefined();
      expect(response.metadata.requirements).toBeDefined();
    });
  });
});
```

### 7.2 Integration Tests
```typescript
describe('AOKHandlerManager', () => {
  const manager = new AOKHandlerManager();

  it('should route to correct handler', async () => {
    const response = await manager.handleQuery('Zahnreinigung', {});
    expect(response.metadata.handlerUsed).toBe('DentalHandler');
  });

  it('should fallback to smart search', async () => {
    const response = await manager.handleQuery('Allgemeine Frage', {});
    expect(response.metadata.handlerUsed).toBe('SmartSearch');
  });
});
```

## 8. Debugging

### 8.1 Logging
```typescript
class BaseHandler {
  protected log(message: string, data?: any) {
    console.log(`[${this.constructor.name}] ${message}`, data);
  }

  protected error(message: string, error?: any) {
    console.error(`[${this.constructor.name}] ${message}`, error);
  }
}
```

### 8.2 Monitoring
- Handler-Performance
- Erkennungsrate
- Antwortqualität
- Fallback-Rate

### 8.3 Fehlerbehandlung
- Validierung
- Retry-Logik
- Fallback-Strategien
- Error-Reporting 