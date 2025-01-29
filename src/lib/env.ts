const requiredEnvs = ['POSTGRES_PRISMA_URL'] as const

export function validateEnv() {
  for (const env of requiredEnvs) {
    if (!process.env[env]) {
      throw new Error(`Missing required environment variable: ${env}`)
    }
  }
}

// Validate on import
validateEnv() 