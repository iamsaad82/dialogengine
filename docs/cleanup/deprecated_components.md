# Veraltete Komponenten - Bereinigungsplan

## Zu entfernende Komponenten

### 1. Alte Handler-Struktur
Kompletter Ordner: `/src/lib/services/handlers/aok/`

#### Betroffene Dateien: 
- `AOKHandlerManager.ts`
- `BaseAOKHandler.ts`
- `DentalHandler.ts`
- `FamilyHandler.ts`
- `MedicalTreatmentHandler.ts`
- `NutritionHandler.ts`
- `PreventionHandler.ts`
- `RehabilitationHandler.ts`
- `SportsHandler.ts`
- `TherapyHandler.ts`
- `VisionHearingHandler.ts`
- `types.ts`

### 2. Redundante Content-Bereiche
- `/src/app/admin/templates/[id]/content/`
- `/src/app/admin/templates/[id]/content-types/`
Diese werden in einem neuen, vereinheitlichten Content-Management zusammengeführt.

### 3. Veraltete Bot-Konfiguration
- Alte AOK-spezifische Bot-Implementierung
- Manuelle Handler-Zuweisungen
- Nicht-templatebasierte Konfigurationen

### 4. Aktive Komponenten (NICHT entfernen)
- `/src/lib/services/search/handlers/specialized/aok.ts` (Als Referenz für Migration)
- `/src/lib/services/search/handlers/manager.ts` (Wird angepasst)
- `/src/components/admin/template/BotEditor.tsx` (Wird erweitert)
- `/src/components/admin/ContentTypeManager.tsx` (Wird erweitert)

## Neue Struktur

### 1. Handler-System
```typescript
// Neue Handler-Struktur
interface HandlerConfig {
  type: string
  name: string
  active: boolean
  capabilities: string[]
  config: {
    patterns: Array<{
      name: string
      pattern: string
      required: boolean
      examples: string[]
      extractMetadata?: string[]
    }>
    metadata: Record<string, any>
    settings: {
      matchThreshold: number
      contextWindow: number
      maxTokens: number
      dynamicResponses: boolean
      includeLinks?: boolean
      includeContact?: boolean
      includeSteps?: boolean
      includePrice?: boolean
      includeAvailability?: boolean
      useExactMatches?: boolean
    }
  }
  metadata?: {
    generated?: boolean
    timestamp?: string
    version?: string
    industry?: string
    category?: string
    confidence?: number
    templateId?: string
  }
}

// Template-Konfiguration
interface TemplateConfig {
  id: string
  name: string
  version: string
  structure: {
    patterns: Array<{
      name: string
      pattern: string
      required: boolean
      examples: string[]
      extractMetadata?: string[]
    }>
    sections: Array<{
      id: string
      type: string
      required: boolean
      fields: string[]
    }>
    metadata: Record<string, any>
    extractors: Array<{
      field: string
      pattern: string
      metadata: string[]
    }>
  }
  handlerConfig: {
    responseTypes: string[]
    requiredMetadata: string[]
    customSettings: {
      useMarkdown: boolean
      formatDates: boolean
      includeMeta: boolean
    }
  }
}
```

### 2. Bot-System
```typescript
// Neue Bot-Typen
type BotType = 
  | 'smart-search'
  | 'flowise'
  | 'examples'
  | 'template-handler';

// Bot-Konfiguration
interface BotConfig {
  type: BotType;
  config: Record<string, any>;
  handlers: string[]; // Handler-IDs
}
```

### 3. Content-Management
```typescript
// Vereinheitlichtes Content-System
interface ContentManagement {
  vectors: VectorStore;
  types: ContentTypes;
  validation: ContentRules;
}
```

## Bereinigungsschritte

### 1. Vorbereitung
```bash
# Backup-Branch erstellen
git checkout -b backup/pre-cleanup
git add .
git commit -m "chore: Backup vor Systembereinigung"
git push origin backup/pre-cleanup
```

### 2. Validierung
1. Import-Statements überprüfen
2. Abhängigkeiten analysieren
3. Aktive Komponenten testen
4. Datenbank-Integrität sichern

### 3. Schrittweise Migration

#### 3.1 Handler-Migration
1. Template-Handler in Datenbank übertragen
2. Handler-Logik anpassen
3. Tests durchführen

#### 3.2 Content-Vereinheitlichung
1. Content-Bereiche zusammenführen
2. Vektorisierung integrieren
3. UI anpassen

#### 3.3 Bot-System-Update
1. Neue Bot-Typen implementieren
2. Handler-Integration anpassen
3. Konfiguration migrieren

### 4. Tests
1. Unit-Tests für neue Struktur
2. Integration-Tests für Migration
3. End-to-End-Tests für Gesamtsystem

### 5. Deployment
1. Staging-Deployment
2. Migrations-Validierung
3. Produktions-Rollout

## Monitoring

### 1. Während der Migration
- Error-Logs überwachen
- Performance-Metriken tracken
- API-Responses validieren
- Datenbank-Integrität prüfen

### 2. Nach der Migration
- System-Performance vergleichen
- Handler-Effizienz messen
- Bot-Antwortzeiten analysieren
- Vector-Suche evaluieren

## Dokumentation

### 1. Changelog
- Entfernte Komponenten dokumentieren
- Migrationspfade beschreiben
- Systemänderungen erfassen

### 2. Architektur-Updates
- System-Dokumentation aktualisieren
- API-Dokumentation anpassen
- Entwickler-Guides erneuern

### 3. Neue Dokumentation
- Handler-System beschreiben
- Bot-Typen dokumentieren
- Content-Management erklären
- Vector-Store-Integration beschreiben

## Rollback-Plan

### 1. Sofort-Rollback
```bash
# Zurück zum Backup-Branch
git checkout backup/pre-cleanup
git push origin backup/pre-cleanup:main -f
```

### 2. Gradueller Rollback
- Komponenten einzeln wiederherstellen
- Datenbank-Backup einspielen
- Konfiguration wiederherstellen

### 3. Notfall-Prozeduren
- Datenbank-Snapshots
- API-Versionierung
- Feature-Flags 