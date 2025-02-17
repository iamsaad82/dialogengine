import { BotConfig } from '@/lib/types/template'

const aokConfig: BotConfig = {
  type: 'aok-handler',
  aokHandler: {
    pineconeApiKey: process.env.PINECONE_API_KEY || '',
    pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
    pineconeIndex: process.env.PINECONE_INDEX || '',
    openaiApiKey: process.env.OPENAI_API_KEY || ''
  }
}

export default aokConfig 