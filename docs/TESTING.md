# Dialog Engine - Test-Dokumentation

## 1. Test-Strategie

Die Dialog Engine verwendet einen mehrschichtigen Testansatz, um die Qualität und Zuverlässigkeit des Systems sicherzustellen.

### 1.1 Testebenen

1. **Unit Tests**
   - Einzelne Komponenten und Funktionen
   - Handler-Logik
   - Utility-Funktionen
   - Service-Methoden

2. **Integration Tests**
   - Handler-Interaktionen
   - Service-Kommunikation
   - API-Endpunkte
   - Datenbank-Operationen

3. **End-to-End Tests**
   - Vollständige Konversationsflüsse
   - UI-Interaktionen
   - Template-Verwaltung
   - Content-Scanning

4. **Performance Tests**
   - Lastverhalten
   - Skalierbarkeit
   - Antwortzeiten
   - Ressourcenverbrauch

## 2. Test-Implementierung

### 2.1 Unit Tests

```typescript
// Handler Tests
describe('DentalHandler', () => {
  const handler = new DentalHandler()
  
  describe('canHandle', () => {
    it('should handle dental queries', () => {
      expect(handler.canHandle('Zahnreinigung')).toBe(true)
      expect(handler.canHandle('Implantate')).toBe(true)
    })

    it('should not handle non-dental queries', () => {
      expect(handler.canHandle('Physiotherapie')).toBe(false)
    })
  })

  describe('getResponse', () => {
    it('should provide valid metadata', async () => {
      const response = await handler.getResponse('Zahnreinigung', {})
      expect(response.metadata.nextSteps).toBeDefined()
      expect(response.metadata.requirements).toBeDefined()
    })

    it('should handle context', async () => {
      const context = {
        currentProcess: 'dental-treatment',
        processStep: 'cost-inquiry'
      }
      const response = await handler.getResponse('Kosten', context)
      expect(response.metadata.costs).toBeDefined()
    })
  })
})

// Service Tests
describe('ContentVectorizer', () => {
  const vectorizer = new ContentVectorizer({
    openaiApiKey: 'test-key',
    pineconeApiKey: 'test-key',
    pineconeEnvironment: 'test',
    pineconeIndex: 'test-index'
  })

  describe('vectorize', () => {
    it('should create valid vectors', async () => {
      const result = await vectorizer.vectorize('Test content')
      expect(result.length).toBe(1536)
    })

    it('should handle metadata', async () => {
      const result = await vectorizer.vectorizeWithMetadata({
        text: 'Test content',
        metadata: {
          title: 'Test',
          url: 'https://test.com'
        }
      })
      expect(result.metadata).toBeDefined()
    })
  })
})
```

### 2.2 Integration Tests

```typescript
// API Tests
describe('Chat API', () => {
  it('should handle chat requests', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({
        message: 'Test message',
        templateId: 'test-template',
        sessionId: 'test-session'
      })
    
    expect(response.status).toBe(200)
    expect(response.body.answer).toBeDefined()
  })

  it('should maintain context', async () => {
    const session = 'test-session'
    
    // Erste Nachricht
    await request(app)
      .post('/api/chat')
      .send({
        message: 'Was kostet eine Zahnreinigung?',
        templateId: 'test-template',
        sessionId: session
      })
    
    // Folgenachricht
    const response = await request(app)
      .post('/api/chat')
      .send({
        message: 'Und wenn es länger dauert?',
        templateId: 'test-template',
        sessionId: session
      })
    
    expect(response.body.answer).toContain('Kosten')
  })
})

// Service Integration Tests
describe('Smart Search Integration', () => {
  it('should find relevant documents', async () => {
    const search = new SmartSearch()
    const results = await search.search('Zahnreinigung', 'test-template')
    
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].score).toBeGreaterThan(0.5)
  })
})
```

### 2.3 End-to-End Tests

```typescript
// Cypress Tests
describe('Chat Interface', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should send and receive messages', () => {
    cy.get('[data-testid="chat-input"]')
      .type('Hallo{enter}')
    
    cy.get('[data-testid="chat-messages"]')
      .should('contain', 'Hallo')
      .should('contain', 'Wie kann ich Ihnen helfen?')
  })

  it('should handle document uploads', () => {
    cy.get('[data-testid="upload-button"]').click()
    cy.get('input[type="file"]').attachFile('test.pdf')
    cy.get('[data-testid="upload-status"]')
      .should('contain', 'Erfolgreich hochgeladen')
  })
})
```

## 3. Test-Automatisierung

### 3.1 CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run linter
      run: npm run lint
      
    - name: Run type check
      run: npm run type-check
      
    - name: Run unit tests
      run: npm run test:unit
      
    - name: Run integration tests
      run: npm run test:integration
      
    - name: Run E2E tests
      run: npm run test:e2e
```

### 3.2 Test-Skripte

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=src/.*\\.test\\.ts$",
    "test:integration": "jest --testPathPattern=src/.*\\.integration\\.test\\.ts$",
    "test:e2e": "cypress run",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch"
  }
}
```

## 4. Test-Daten

### 4.1 Mock-Daten

```typescript
// mocks/templates.ts
export const mockTemplates = {
  'test-template': {
    id: 'test-template',
    name: 'Test Template',
    config: {
      theme: {
        primary: '#007AFF',
        secondary: '#5856D6',
        background: '#FFFFFF'
      },
      bot: {
        name: 'TestBot',
        avatar: 'https://example.com/avatar.png'
      }
    }
  }
}

// mocks/responses.ts
export const mockResponses = {
  dental: {
    answer: 'Eine professionelle Zahnreinigung kostet...',
    metadata: {
      nextSteps: ['Termin vereinbaren'],
      requirements: ['Versichertenkarte'],
      costs: ['70-150€']
    }
  }
}
```

### 4.2 Test-Umgebung

```typescript
// test/setup.ts
import { setupTestDatabase } from './utils/database'
import { setupTestRedis } from './utils/redis'
import { setupTestPinecone } from './utils/pinecone'

beforeAll(async () => {
  await setupTestDatabase()
  await setupTestRedis()
  await setupTestPinecone()
})

afterAll(async () => {
  await cleanupTestEnvironment()
})
```

## 5. Performance-Tests

### 5.1 Last-Tests

```typescript
// tests/performance/load.test.ts
import { LoadTest } from '@/lib/testing/load'

describe('Chat Performance', () => {
  const loadTest = new LoadTest({
    virtualUsers: 100,
    duration: '5m'
  })

  it('should handle concurrent chat requests', async () => {
    const results = await loadTest.run(async (context) => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test message',
          templateId: 'test-template',
          sessionId: `session-${context.userId}`
        })
      })
      
      expect(response.status).toBe(200)
      return response.timing
    })

    expect(results.p95).toBeLessThan(1000) // 95% unter 1s
    expect(results.median).toBeLessThan(500) // Median unter 500ms
  })
})
```

### 5.2 Skalierbarkeits-Tests

```typescript
// tests/performance/scaling.test.ts
describe('Scaling Tests', () => {
  it('should handle increased load', async () => {
    const baseLoad = await measurePerformance(100)
    const doubleLoad = await measurePerformance(200)
    
    // Überprüfe lineare Skalierung
    expect(doubleLoad.timing / baseLoad.timing).toBeLessThan(2.2)
  })
})
```

## 6. Monitoring & Reporting

### 6.1 Test-Coverage

```bash
# Coverage-Report generieren
npm run test:coverage

# Minimale Coverage-Anforderungen
jest.config.js:
{
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
```

### 6.2 Test-Reports

```typescript
// Jest Reporter Konfiguration
module.exports = {
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'reports/junit',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}'
    }],
    ['jest-html-reporter', {
      pageTitle: 'Dialog Engine Test Report',
      outputPath: 'reports/html/test-report.html'
    }]
  ]
}
```

## 7. Best Practices

### 7.1 Test-Organisation
- Tests neben den Implementierungsdateien
- Klare Benennungskonventionen
- Gruppierung nach Funktionalität
- Shared Test Utilities

### 7.2 Test-Qualität
- Aussagekräftige Beschreibungen
- Isolierte Tests
- Vermeidung von Test-Abhängigkeiten
- Realistische Test-Daten

### 7.3 Wartbarkeit
- DRY-Prinzip in Tests
- Wiederverwendbare Fixtures
- Dokumentierte Test-Helpers
- Regelmäßige Test-Reviews

## 8. Checkliste für neue Features

1. **Unit Tests**
   - [ ] Handler-Tests geschrieben
   - [ ] Service-Tests geschrieben
   - [ ] Edge Cases abgedeckt
   - [ ] Mocks konfiguriert

2. **Integration Tests**
   - [ ] API-Tests geschrieben
   - [ ] Service-Integration getestet
   - [ ] Datenbank-Operationen getestet
   - [ ] Fehlerszenarien abgedeckt

3. **E2E Tests**
   - [ ] UI-Flows getestet
   - [ ] User Journeys abgedeckt
   - [ ] Mobile Responsiveness getestet
   - [ ] Browser-Kompatibilität geprüft

4. **Performance**
   - [ ] Last-Tests durchgeführt
   - [ ] Skalierbarkeit getestet
   - [ ] Memory Leaks geprüft
   - [ ] Response Times gemessen 