# Dialog Engine - API-Dokumentation

## 1. Übersicht

Die Dialog Engine bietet eine RESTful API für die Integration des Chatbots in verschiedene Anwendungen. Die API ermöglicht das Verwalten von Templates, das Durchführen von Konversationen und das Scannen von Dokumenten.

## 2. Authentifizierung

Alle API-Endpunkte erfordern eine Authentifizierung mittels Bearer Token:

```http
Authorization: Bearer <API_TOKEN>
```

## 3. API-Endpunkte

### 3.1 Chat API

#### Neue Nachricht senden
```http
POST /api/chat
Content-Type: application/json

{
  "message": string,
  "templateId": string,
  "sessionId": string,
  "context"?: {
    "currentProcess"?: string,
    "processStep"?: string,
    "metadata"?: Record<string, any>
  }
}
```

**Response:**
```json
{
  "answer": string,
  "metadata": {
    "nextSteps"?: string[],
    "requirements"?: string[],
    "costs"?: string[],
    "contacts"?: Contact[],
    "relatedTopics"?: string[]
  },
  "context": Context
}
```

### 3.2 Document Upload API

#### Dokument hochladen
```http
POST /api/upload/document
Content-Type: multipart/form-data

file: File
jobId: string
templateId: string
```

**Response:**
```json
{
  "success": boolean,
  "message": string,
  "filePath"?: string,
  "jobId"?: string
}
```

### 3.3 Search API

#### Dokumente durchsuchen
```http
GET /api/search?query={query}&templateId={templateId}
```

**Response:**
```json
{
  "results": Array<{
    "text": string,
    "metadata": {
      "url": string,
      "title": string,
      "type": string,
      "requirements"?: string[],
      "costs"?: string[]
    },
    "score": number
  }>
}
```

### 3.4 Template API

#### Template erstellen
```http
POST /api/templates
Content-Type: application/json

{
  "name": string,
  "description": string,
  "config": {
    "theme": {
      "primary": string,
      "secondary": string,
      "background": string
    },
    "bot": {
      "name": string,
      "avatar": string
    },
    "features": {
      "smartSearch": boolean,
      "processTracking": boolean,
      "interactiveElements": boolean
    }
  }
}
```

#### Template aktualisieren
```http
PUT /api/templates/{templateId}
Content-Type: application/json

{
  "name"?: string,
  "description"?: string,
  "config"?: TemplateConfig
}
```

#### Template löschen
```http
DELETE /api/templates/{templateId}
```

## 4. Fehlerbehandlung

Die API verwendet Standard HTTP-Statuscodes:

- 200: Erfolgreiche Anfrage
- 400: Ungültige Anfrage
- 401: Nicht authentifiziert
- 403: Nicht autorisiert
- 404: Ressource nicht gefunden
- 500: Serverfehler

Fehlermeldungen haben folgendes Format:
```json
{
  "error": string,
  "message": string,
  "details"?: any
}
```

## 5. Rate Limiting

- 100 Anfragen pro Minute pro API-Key
- 1000 Anfragen pro Stunde pro API-Key
- Bei Überschreitung: 429 Too Many Requests

## 6. Websocket API

### 6.1 Chat-Stream

```typescript
// Verbindung herstellen
const ws = new WebSocket('wss://api.dialog-engine.com/chat')

// Authentifizierung
ws.send(JSON.stringify({
  type: 'auth',
  token: 'API_TOKEN'
}))

// Nachricht senden
ws.send(JSON.stringify({
  type: 'message',
  data: {
    message: string,
    templateId: string,
    sessionId: string
  }
}))

// Antwort empfangen
ws.onmessage = (event) => {
  const response = JSON.parse(event.data)
  // response.type: 'partial' | 'complete'
  // response.data: MessageResponse
}
```

## 7. Beispiele

### 7.1 Chat-Konversation
```typescript
// Chat-Nachricht senden
const response = await fetch('https://api.dialog-engine.com/api/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer API_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'Was sind die Kosten für eine Zahnreinigung?',
    templateId: 'aok-template',
    sessionId: 'user-123'
  })
})

const result = await response.json()
console.log(result.answer)
console.log(result.metadata.costs)
```

### 7.2 Dokument hochladen
```typescript
const formData = new FormData()
formData.append('file', file)
formData.append('jobId', 'job-123')
formData.append('templateId', 'aok-template')

const response = await fetch('https://api.dialog-engine.com/api/upload/document', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer API_TOKEN'
  },
  body: formData
})

const result = await response.json()
console.log(result.success)
```

## 8. Typdefinitionen

```typescript
interface Context {
  sessionId: string
  currentProcess?: string
  processStep?: string
  history: Interaction[]
  metadata: Map<string, any>
}

interface Interaction {
  query: string
  response: Response
  timestamp: Date
  handlerUsed: string
}

interface Response {
  answer: string
  metadata: ResponseMetadata
}

interface ResponseMetadata {
  nextSteps?: string[]
  requirements?: string[]
  costs?: string[]
  contacts?: Contact[]
  relatedTopics?: string[]
}

interface Contact {
  type: string
  name?: string
  url?: string
  phone?: string
  email?: string
  address?: string
}

interface TemplateConfig {
  theme: {
    primary: string
    secondary: string
    background: string
  }
  bot: {
    name: string
    avatar: string
  }
  features: {
    smartSearch: boolean
    processTracking: boolean
    interactiveElements: boolean
  }
}
```

## 9. Best Practices

### 9.1 Fehlerbehandlung
- Implementieren Sie Retry-Logik für temporäre Fehler
- Verwenden Sie exponentielles Backoff
- Loggen Sie alle API-Fehler

### 9.2 Performance
- Nutzen Sie Connection Pooling
- Implementieren Sie Client-seitiges Caching
- Verwenden Sie Compression

### 9.3 Sicherheit
- Rotieren Sie API-Keys regelmäßig
- Verwenden Sie HTTPS
- Validieren Sie alle Eingaben

## 10. Support

Bei Fragen oder Problemen:
- Email: support@dialog-engine.com
- Dokumentation: https://docs.dialog-engine.com
- Status: https://status.dialog-engine.com 