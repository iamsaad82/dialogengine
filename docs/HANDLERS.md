# Handler-Dokumentation

## Übersicht

Die Handler-Architektur des DialogEngine-Systems basiert auf einem flexiblen, erweiterbaren Design mit dem `BaseHandler` als Grundlage. Das System ist speziell für die AOK-spezifische Verarbeitung von Benutzeranfragen optimiert.

## Basis-Architektur

### BaseHandler

Der `BaseHandler` stellt das Grundgerüst für alle spezialisierten Handler bereit.

#### Kernfunktionen

1. **Query-Verarbeitung**
   ```typescript
   public async handleSearch(query: string): Promise<any>
   ```
   - Zentrale Methode für die Verarbeitung von Suchanfragen
   - Integriertes Monitoring (Erfolg/Fehler, Latenz)
   - Fehlerbehandlung und Validierung

2. **Validierung**
   ```typescript
   protected validateQuery(query: string): void
   ```
   - Prüft Mindestlänge (3 Zeichen)
   - Erweiterbar für spezifische Validierungsregeln

3. **Suche**
   ```typescript
   protected async search(query: string): Promise<any[]>
   ```
   - Abstrakte Methode für die eigentliche Suchlogik
   - Wird von spezialisierten Handlern implementiert

4. **Antwort-Formatierung**
   ```typescript
   protected formatResponse(results: any[]): any
   ```
   - Template-basierte Antwortgenerierung
   - Variablen-Ersetzung mit {{variable}}
   - JSON-Parsing der formatierten Antwort

5. **Metadaten-Validierung**
   ```typescript
   public validateMetadata(metadata: ContentMetadata): boolean
   ```
   - Prüfung von Pflichtfeldern
   - Typ- und Template-Validierung
   - Feldspezifische Validierungsregeln

#### Monitoring & Metriken

- Erfolgs- und Fehlerrate pro Handler
- Latenzzeiten mit verschiedenen Buckets
- Automatische Metrik-Sammlung

## Implementierte Handler

### Aktuelle AOK-Handler

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

### TestHandler

Ein Beispiel-Handler für Tests und Entwicklung.

#### Konfiguration
```typescript
{
  type: 'test',
  searchFields: ['message', 'content'],
  responseTemplate: '{"message": "{{message}}"}',
  validationRules: {
    type: 'test',
    required: [],
    validation: {}
  }
}
```

#### Funktionen
- Simuliert verschiedene Antwortszenarien:
  - Schnelle Antworten (`fast`)
  - Langsame Antworten (`slow`, 2s Verzögerung)
  - Fehler (`error`)
  - Standard (100ms Verzögerung)

#### Verwendung
```typescript
const handler = new TestHandler();
const results = await handler.handleSearch("test query");
```

## Geplante Handler-Migration

### Phase 1: Vorbereitung
- [x] Performance-Tests implementiert
- [x] Monitoring-System eingerichtet
- [ ] A/B-Testing-Infrastruktur

### Phase 2: Migration
Reihenfolge der Handler-Migration:

1. **MedicalHandler** (Nächster Schritt)
   - Spezialisiert auf medizinische Anfragen
   - Komplexe Validierungsregeln
   - Sensible Datenschutzanforderungen

2. **InsuranceHandler**
   - Versicherungsspezifische Logik
   - Strukturierte Antwortformate
   - Integration mit Versicherungs-APIs

3. **CityAdministrationHandler**
   - Verwaltungsspezifische Anfragen
   - Mehrsprachige Unterstützung
   - Behörden-Schnittstellen

## Best Practices

### Handler-Entwicklung

1. **Validierung**
   - Immer `super.validateQuery()` aufrufen
   - Spezifische Validierungsregeln hinzufügen
   - Aussagekräftige Fehlermeldungen

2. **Fehlerbehandlung**
   - Spezifische Error-Klassen verwenden
   - Fehler loggen und monitoren
   - Benutzerfreundliche Fehlermeldungen

3. **Performance**
   - Caching wo sinnvoll
   - Asynchrone Operationen
   - Timeout-Handling

4. **Monitoring**
   - Relevante Metriken definieren
   - Latenzzeiten überwachen
   - Fehlerraten tracken

### Template-System

1. **Response-Templates**
   - Klare Variablen-Namen
   - Validierung der Pflichtfelder
   - Fallback-Werte definieren

2. **Formatierung**
   - Konsistentes JSON-Format
   - Typsichere Konvertierung
   - Escaping von Sonderzeichen

## Migrationsleitfaden

### Schritte für neue Handler

1. **Vorbereitung**
   ```typescript
   import { BaseHandler } from './BaseHandler';
   
   export class NewHandler extends BaseHandler {
     constructor() {
       super({
         type: 'new_type',
         searchFields: ['field1', 'field2'],
         responseTemplate: '{"key": "{{value}}"}',
         validationRules: {
           type: 'new_type',
           required: ['field1'],
           validation: {
             field1: {
               minLength: 3,
               maxLength: 100
             }
           }
         }
       });
     }
   }
   ```

2. **Implementierung**
   ```typescript
   protected async search(query: string): Promise<any[]> {
     // Spezifische Suchlogik
     return [];
   }
   ```

3. **Tests**
   ```typescript
   describe('NewHandler', () => {
     it('should handle basic search', async () => {
       const handler = new NewHandler();
       const result = await handler.handleSearch('test');
       expect(result).toBeDefined();
     });
   });
   ```

### Validierung & Testing

1. **Unit Tests**
   - Erfolgsszenarien
   - Fehlerfälle
   - Edge Cases

2. **Integration Tests**
   - Handler-Interaktion
   - API-Integration
   - Performance-Tests

3. **Last-Tests**
   - Concurrent Requests
   - Ressourcenverbrauch
   - Timeout-Verhalten

## Nächste Schritte

1. **A/B-Testing-Infrastruktur**
   - Framework aufsetzen
   - Metriken definieren
   - Analyse-Tools integrieren

2. **MedicalHandler Migration**
   - Aktuelle Implementierung analysieren
   - Neue Version entwickeln
   - Parallel-Betrieb testen

3. **Dokumentation erweitern**
   - API-Referenz
   - Beispiel-Implementierungen
   - Troubleshooting-Guide 