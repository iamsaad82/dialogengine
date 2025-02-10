# Cursor Composer - Best Practices

## Quick Start: Neuer Chat

### Zu Beginn eines neuen Chats:
1. Verweisen Sie auf diese Anleitung:
   ```typescript
   "Bitte berücksichtigen Sie die Anweisungen in docs/INSTRUCTIONS.md für unsere Zusammenarbeit."
   ```

2. Geben Sie den aktuellen Kontext:
   ```typescript
   "Ich arbeite an [FEATURE/BUGFIX/etc.]. 
   Relevante Dateien sind:
   - src/components/...
   - src/lib/...
   [WEITERE RELEVANTE INFORMATIONEN]"
   ```

3. Definieren Sie das Ziel:
   ```typescript
   "Ziel ist es, [KONKRETE BESCHREIBUNG DES ZIELS]."
   ```

### Beispiel für einen guten Chat-Start:
```typescript
"Bitte berücksichtigen Sie die Anweisungen in docs/INSTRUCTIONS.md für unsere Zusammenarbeit.

Ich arbeite an der Erweiterung des Template-Editors. 
Relevante Dateien sind:
- src/components/admin/TemplateEditor.tsx
- src/lib/types/template.ts
- src/lib/schemas/template.ts

Ziel ist es, ein neues Feld für Custom CSS im Template-Editor hinzuzufügen."
```

## 1. Vor dem Start eines neuen Chats

### 1.1 Workspace-Status prüfen
- Öffnen Sie den Git-Status, um ungespeicherte Änderungen zu sehen
- Stellen Sie sicher, dass keine temporären Dateien im Workspace sind
- Prüfen Sie, ob alle Dokumente korrekt gespeichert wurden

### 1.2 Dokumente vorbereiten
- Relevante Dateien explizit öffnen
- Cursor an die richtige Stelle setzen
- Wichtige Dateien in Recently Viewed Files behalten

## 2. Während der Arbeit mit Composer

### 2.1 Vermeidung von Überschreibungen
- Vor jeder Änderung den aktuellen Inhalt prüfen
- Bei Bearbeitung bestehender Dateien immer erst `read_file` nutzen
- Änderungen Schritt für Schritt reviewen
- Bei Unsicherheit Änderungen in temporärer Datei testen

### 2.2 Korrekte Tool-Nutzung
- `read_file` vor Änderungen
- `list_dir` zur Überprüfung des Workspace
- `edit_file` nur mit präzisen Anweisungen
- Bei Fehlern `reapply` nutzen

### 2.3 Versionskontrolle
- Regelmäßige Git-Commits
- Branches für größere Änderungen
- Backup wichtiger Dateien vor umfangreichen Änderungen

## 3. Nach Änderungen

### 3.1 Review-Prozess
- Alle geänderten Dateien überprüfen
- Formatierung kontrollieren
- Links und Referenzen testen
- Keine ungewollten Duplikate

### 3.2 Cleanup
- Temporäre Dateien entfernen
- Git-Status prüfen
- Ungewollte Änderungen rückgängig machen

## 4. Typische Probleme & Lösungen

### 4.1 Doppelte Dateien
Problem: Composer erstellt neue Datei statt bestehende zu bearbeiten
```bash
# Lösung: Vor Erstellung prüfen
ls docs/
git status
```

### 4.2 Überschriebene Inhalte
Problem: Bestehende Inhalte werden überschrieben
```typescript
// Lösung: Immer erst lesen
read_file("docs/DEVELOPMENT.md")
// Dann erst edit_file mit präzisen Anweisungen
```

### 4.3 Angehängte Duplikate
Problem: Inhalte werden doppelt angehängt
```typescript
// Lösung: Klare Anweisungen geben
edit_file({
  target_file: "src/lib/services/smartSearch.ts",
  instructions: "Präzise beschreiben was geändert werden soll",
  code_edit: "Nur die zu ändernden Teile"
})
```

## 5. Best Practices Checkliste

### 5.1 Vor Änderungen
- [ ] Workspace-Status geprüft
- [ ] Relevante Dateien geöffnet
- [ ] Aktuelle Inhalte gelesen
- [ ] Klare Änderungsziele definiert

### 5.2 Während Änderungen
- [ ] Schrittweise vorgehen
- [ ] Änderungen überprüfen
- [ ] Korrekte Tools verwenden
- [ ] Versionskontrolle nutzen

### 5.3 Nach Änderungen
- [ ] Review durchführen
- [ ] Cleanup machen
- [ ] Änderungen committen
- [ ] Dokumentation aktualisieren

## 6. Nützliche Composer-Kommandos

### 6.1 Datei lesen
```typescript
// Backend Services
read_file({
  relative_workspace_path: "src/lib/services/scanner.ts",
  should_read_entire_file: true
})

// UI Komponenten
read_file({
  relative_workspace_path: "src/components/ui/button.tsx",
  should_read_entire_file: true
})

// Templates & Konfiguration
read_file({
  relative_workspace_path: "src/lib/schemas/template.ts",
  should_read_entire_file: true
})

// API Routes
read_file({
  relative_workspace_path: "src/app/api/chat/route.ts",
  should_read_entire_file: true
})

// Dokumentation
read_file({
  relative_workspace_path: "docs/DEVELOPMENT.md",
  should_read_entire_file: true
})
```

### 6.2 Verzeichnis prüfen
```typescript
// UI Komponenten
list_dir({
  relative_workspace_path: "src/components/ui"
})

// Admin Bereich
list_dir({
  relative_workspace_path: "src/components/admin"
})

// Services
list_dir({
  relative_workspace_path: "src/lib/services"
})

// API Routes
list_dir({
  relative_workspace_path: "src/app/api"
})

// Dokumentation
list_dir({
  relative_workspace_path: "docs"
})
```

### 6.3 Datei bearbeiten
```typescript
// Backend Services
edit_file({
  target_file: "src/lib/services/smartSearch.ts",
  instructions: "Smart Search Service anpassen",
  code_edit: "Präzise Änderungen"
})

// UI Komponenten
edit_file({
  target_file: "src/components/ui/dialog.tsx",
  instructions: "Dialog-Komponente erweitern",
  code_edit: "Neue Props hinzufügen"
})

// Template System
edit_file({
  target_file: "src/components/admin/TemplateEditor.tsx",
  instructions: "Template-Editor erweitern",
  code_edit: "Neue Funktionalität hinzufügen"
})

// API Routes
edit_file({
  target_file: "src/app/api/chat/route.ts",
  instructions: "Chat-API erweitern",
  code_edit: "Neue Endpoint-Logik"
})

// Konfiguration
edit_file({
  target_file: "src/lib/config/smartSearch.ts",
  instructions: "Konfiguration anpassen",
  code_edit: "Parameter aktualisieren"
})

// Prisma Schema
edit_file({
  target_file: "prisma/schema.prisma",
  instructions: "Datenbankschema erweitern",
  code_edit: "Neue Modelle hinzufügen"
})

// Tests
edit_file({
  target_file: "src/lib/services/__tests__/smartSearch.test.ts",
  instructions: "Tests erweitern",
  code_edit: "Neue Testfälle hinzufügen"
})
```

### 6.4 Bei Fehlern
```typescript
// UI Komponenten
reapply({
  target_file: "src/components/ui/button.tsx"
})

// Services
reapply({
  target_file: "src/lib/services/vectorizer.ts"
})

// API Routes
reapply({
  target_file: "src/app/api/search/route.ts"
})
```

## 7. Projektbereiche & Typische Änderungen

### 7.1 UI/Frontend
- Components (`src/components/`)
  - UI-Komponenten (`src/components/ui/`)
  - Admin-Bereich (`src/components/admin/`)
  - Template-System (`src/components/template/`)
- Styles (`src/styles/`)
- Hooks (`src/hooks/`)

### 7.2 Backend/Services
- Services (`src/lib/services/`)
- API Routes (`src/app/api/`)
- Datenbank (`prisma/`)
- Konfiguration (`src/lib/config/`)

### 7.3 Types & Schemas
- Types (`src/lib/types/`)
- Schemas (`src/lib/schemas/`)
- Validierung (`src/lib/utils/validation.ts`)

### 7.4 Tests & Dokumentation
- Service Tests (`src/lib/services/__tests__/`)
- Komponenten Tests (`src/components/__tests__/`)
- Dokumentation (`docs/`)

### 7.5 Deployment & Infrastructure
- Docker (`docker-compose.yml`)
- Environment (`env.development`)
- Deployment Configs (`DEPLOYMENT.md`) 