import type { SmartSearchConfig } from '../types/template'

export const DEFAULT_SMART_SEARCH_CONFIG: SmartSearchConfig = {
  provider: 'openai',
  urls: [],
  excludePatterns: ['/admin/*', '/wp-*', '*.pdf', '/wp-json/*', '/api/*'],
  chunkSize: 300,
  temperature: 0.1,
  reindexInterval: 24,
  maxTokensPerRequest: 500,
  maxPages: 100,
  useCache: true,
  similarityThreshold: 0.8,
  apiKey: '',
  indexName: '',
  apiEndpoint: ''
}

// ... rest of the code ... 