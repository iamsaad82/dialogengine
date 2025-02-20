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

#### Document Processor
```typescript
describe('DocumentProcessor', () => {
  it('should extract content correctly', async () => {
    const processor = new DocumentProcessor();
    const result = await processor.processDocument(testFile);
    expect(result.content).toBeDefined();
  });

  it('should detect document type', async () => {
    const processor = new DocumentProcessor();
    const result = await processor.processDocument(testFile);
    expect(result.metadata.type).toBeDefined();
  });
});
```

#### Handler Generator
```typescript
describe('HandlerGenerator', () => {
  it('should generate handler config', async () => {
    const generator = new HandlerGenerator();
    const config = await generator.generateHandler(testDocument);
    expect(config.type).toBeDefined();
    expect(config.metadata).toBeDefined();
  });

  it('should extract patterns', async () => {
    const generator = new HandlerGenerator();
    const config = await generator.generateHandler(testDocument);
    expect(config.config.patterns).toHaveLength(1);
  });
});
```

### 2.2 Integration Tests

#### Upload Process
```typescript
describe('Upload Process', () => {
  it('should process document end-to-end', async () => {
    const result = await uploadAndProcess(testFile);
    expect(result.status).toBe('completed');
    expect(result.handler).toBeDefined();
    expect(result.vectors).toBeDefined();
  });
});
```

#### Query Processing
```typescript
describe('Query Processing', () => {
  it('should handle queries correctly', async () => {
    const response = await processQuery(testQuery);
    expect(response.text).toBeDefined();
    expect(response.metadata).toBeDefined();
  });
});
```

### 2.3 End-to-End Tests

#### Complete Flow
```typescript
describe('Complete Flow', () => {
  it('should handle document upload to query', async () => {
    // Upload & Process
    const uploadResult = await uploadAndProcess(testFile);
    expect(uploadResult.status).toBe('completed');

    // Query
    const queryResult = await processQuery(testQuery);
    expect(queryResult.text).toBeDefined();
  });
});
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

## Test Utilities

### Mock Data
```typescript
const testDocument = {
  content: 'Test content',
  metadata: {
    type: 'test',
    title: 'Test Document'
  }
};

const testQuery = {
  text: 'Test query',
  context: {}
};
```

### Helper Functions
```typescript
async function uploadAndProcess(file: File) {
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: createFormData(file)
  });
  return response.json();
}

async function processQuery(query: string) {
  const response = await fetch('/api/query', {
    method: 'POST',
    body: JSON.stringify({ query })
  });
  return response.json();
}
```

## Performance Tests

### Load Testing
```typescript
describe('Load Testing', () => {
  it('should handle multiple concurrent uploads', async () => {
    const results = await Promise.all(
      testFiles.map(file => uploadAndProcess(file))
    );
    results.forEach(result => {
      expect(result.status).toBe('completed');
    });
  });

  it('should handle multiple concurrent queries', async () => {
    const results = await Promise.all(
      testQueries.map(query => processQuery(query))
    );
    results.forEach(result => {
      expect(result.text).toBeDefined();
    });
  });
});
```

## Monitoring Tests

### Performance Metrics
```typescript
describe('Performance Metrics', () => {
  it('should track processing time', async () => {
    const start = Date.now();
    await uploadAndProcess(testFile);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(maxProcessingTime);
  });

  it('should track memory usage', async () => {
    const memoryBefore = process.memoryUsage();
    await uploadAndProcess(largeTestFile);
    const memoryAfter = process.memoryUsage();
    expect(memoryAfter.heapUsed - memoryBefore.heapUsed)
      .toBeLessThan(maxMemoryIncrease);
  });
});
```

## Continuous Integration

### GitHub Actions
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: Run E2E tests
        run: npm run test:e2e
```

## Best Practices

1. **Isolierte Tests**
   - Jeder Test sollte unabhängig sein
   - Mocks für externe Dienste verwenden
   - Testdaten zurücksetzen

2. **Aussagekräftige Namen**
   - Beschreibende Test-Namen
   - Klare Erwartungen
   - Dokumentierte Randfälle

3. **Vollständige Abdeckung**
   - Erfolgsszenarien
   - Fehlerfälle
   - Grenzfälle
   - Edge Cases 