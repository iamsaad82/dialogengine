# Veraltete Komponenten - Bereinigungsplan

## Zu entfernende Komponenten

### 1. Alte AOK-Handler-Struktur
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

### 2. Aktive Komponenten (NICHT entfernen)
- `/src/lib/services/search/handlers/specialized/aok.ts`
- `/src/lib/services/search/handlers/manager.ts`

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
1. Überprüfen der Import-Statements im gesamten Projekt
2. Sicherstellen, dass keine versteckten Abhängigkeiten existieren
3. Testen der aktiven Komponenten

### 3. Schrittweise Entfernung
1. Entfernen der einzelnen Handler-Klassen
2. Entfernen des BaseAOKHandler
3. Entfernen des AOKHandlerManager
4. Entfernen der Types

### 4. Tests
1. Unit-Tests ausführen
2. Integration-Tests ausführen
3. End-to-End-Tests ausführen

### 5. Deployment
1. Deployment in Staging-Umgebung
2. Ausführliche Tests in Staging
3. Deployment in Produktion

## Rollback-Plan

### 1. Sofort-Rollback
```bash
# Zurück zum Backup-Branch
git checkout backup/pre-cleanup
git push origin backup/pre-cleanup:main -f
```

### 2. Gradueller Rollback
- Einzelne Komponenten können aus dem Backup-Branch wiederhergestellt werden
- Git-History bleibt erhalten für detaillierte Analyse

## Monitoring

### 1. Während der Bereinigung
- Error-Logs überwachen
- Performance-Metriken beobachten
- API-Responses überprüfen

### 2. Nach der Bereinigung
- System-Performance vergleichen
- Memory-Usage analysieren
- Response-Zeiten messen

## Dokumentation

### 1. Changelog
- Dokumentation aller entfernten Komponenten
- Begründung der Entfernung
- Auswirkungen auf das System

### 2. Architektur-Updates
- Aktualisierung der System-Dokumentation
- Anpassung der API-Dokumentation
- Update der Entwickler-Guides 