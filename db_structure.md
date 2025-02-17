# Datenbankstruktur

Dieses Dokument beschreibt die Datenbankstruktur des DialogEngine-Projekts.

## Tabellen

### Users
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  hashedPassword TEXT,
  role UserRole DEFAULT 'USER',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### Templates
```sql
CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'NEUTRAL',
  active BOOLEAN DEFAULT true,
  subdomain TEXT UNIQUE,
  jsonContent TEXT,
  jsonBranding TEXT,
  jsonBot TEXT,
  jsonMeta TEXT,
  flowiseConfigId TEXT UNIQUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP,
  FOREIGN KEY (flowiseConfigId) REFERENCES flowise_configs(id)
);
```

### FlowiseConfigs
```sql
CREATE TABLE flowise_configs (
  id TEXT PRIMARY KEY,
  url VARCHAR(255) NOT NULL,
  apiKey VARCHAR(255),
  responseRules JSONB DEFAULT '[]',
  defaultButtons JSONB DEFAULT '[]',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### ResponseTypes
```sql
CREATE TABLE response_types (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  schema JSONB NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### Assets
```sql
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  url VARCHAR(255) NOT NULL,
  key VARCHAR(255) NOT NULL,
  size INTEGER NOT NULL,
  mimeType VARCHAR(100) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### ChatLogs
```sql
CREATE TABLE chat_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  question TEXT NOT NULL,
  answer TEXT,
  wasAnswered BOOLEAN NOT NULL,
  matchedExampleId TEXT,
  templateId TEXT NOT NULL,
  sessionId TEXT NOT NULL,
  FOREIGN KEY (templateId) REFERENCES templates(id) ON DELETE CASCADE
);
```

### ExtractionSchema
```sql
CREATE TABLE extraction_schema (
  id TEXT PRIMARY KEY,
  templateId TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  fields JSONB NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP,
  FOREIGN KEY (templateId) REFERENCES templates(id) ON DELETE CASCADE
);
```

## Enums

### UserRole
- ADMIN
- USER

### TemplateType
- NEUTRAL
- INDUSTRY
- CUSTOM

## Indizes
- assets_type_idx ON assets(type)
- chat_logs_templateId_idx ON chat_logs(templateId)
- chat_logs_timestamp_idx ON chat_logs(timestamp)

## Beziehungen

### Template -> FlowiseConfig
- 1:1 Beziehung
- ON DELETE SET NULL

### ChatLog -> Template
- N:1 Beziehung
- ON DELETE CASCADE

### ExtractionSchema -> Template
- 1:1 Beziehung
- ON DELETE CASCADE

## Performance-Optimierung

### Indizierung
- Timestamp-Index für effiziente Zeitabfragen
- Template-ID-Index für schnelle Zuordnung
- Asset-Type-Index für Typ-basierte Suche

### Constraints
- Eindeutige E-Mail-Adressen
- Eindeutige Subdomains
- Referenzielle Integrität durch Fremdschlüssel

## Schema-Evolution
- Versionierung durch ExtractionSchema
- Migrationen in prisma/migrations
- Automatische Rollbacks bei Fehlern 