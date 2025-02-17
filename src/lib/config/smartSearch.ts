export interface SmartSearchConfig {
  urls: string[]
  temperature: number
  maxTokens: number
  systemPrompt: string
  userPrompt: string
  followupPrompt: string
  pinecone: {
    indexName: string
    environment: string
  }
  excludePatterns: string[]
  chunkSize: number
}

export const DEFAULT_SMART_SEARCH_CONFIG: SmartSearchConfig = {
  urls: [],
  temperature: 0.7,
  maxTokens: 1000,
  systemPrompt: 'Du bist ein hilfreicher Assistent.',
  userPrompt: 'Bitte beantworte meine Frage basierend auf den bereitgestellten Dokumenten.',
  followupPrompt: 'Hast du noch weitere Fragen?',
  pinecone: {
    indexName: '',
    environment: ''
  },
  excludePatterns: ['/admin/*', '/wp-*', '*.pdf', '/wp-json/*', '/api/*'],
  chunkSize: 300
}

// ... rest of the code ... 