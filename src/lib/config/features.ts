import { z } from 'zod'

/**
 * Feature-Flag Interface
 */
export interface FeatureFlag {
  name: string
  enabled: boolean
  rolloutPercentage: number
  fallbackEnabled: boolean
}

/**
 * Feature-Flag Schema
 */
export const featureFlagSchema = z.object({
  name: z.string(),
  enabled: z.boolean(),
  rolloutPercentage: z.number().min(0).max(100),
  fallbackEnabled: z.boolean()
})

/**
 * Verfügbare Features
 */
export const FEATURES = {
  improvedHandlers: {
    name: 'improved_handlers',
    enabled: true,
    rolloutPercentage: 100,
    fallbackEnabled: false
  },
  vectorSearch: {
    name: 'vector_search',
    enabled: true,
    rolloutPercentage: 100,
    fallbackEnabled: true
  },
  hybridResponses: {
    name: 'hybrid_responses',
    enabled: true,
    rolloutPercentage: 100,
    fallbackEnabled: false
  }
} as const

/**
 * Feature-Flag Manager
 */
export class FeatureManager {
  private static instance: FeatureManager
  private features: Map<string, FeatureFlag>

  private constructor() {
    this.features = new Map(
      Object.entries(FEATURES).map(([key, value]) => [key, value])
    )
  }

  static getInstance(): FeatureManager {
    if (!FeatureManager.instance) {
      FeatureManager.instance = new FeatureManager()
    }
    return FeatureManager.instance
  }

  /**
   * Prüft ob ein Feature aktiviert ist
   */
  isEnabled(featureName: keyof typeof FEATURES, context?: Record<string, unknown>): boolean {
    const feature = this.features.get(featureName)
    if (!feature) return false

    // Wenn das Feature global deaktiviert ist
    if (!feature.enabled) {
      return feature.fallbackEnabled
    }

    // Wenn kein Rollout-Prozentsatz definiert ist
    if (!feature.rolloutPercentage) {
      return feature.enabled
    }

    // Berechne Hash für konsistentes Routing
    const hash = this.calculateHash(featureName, context)
    return (hash % 100) < feature.rolloutPercentage
  }

  /**
   * Aktiviert ein Feature
   */
  enableFeature(featureName: keyof typeof FEATURES): void {
    const feature = this.features.get(featureName)
    if (feature) {
      feature.enabled = true
      this.features.set(featureName, feature)
    }
  }

  /**
   * Deaktiviert ein Feature
   */
  disableFeature(featureName: keyof typeof FEATURES): void {
    const feature = this.features.get(featureName)
    if (feature) {
      feature.enabled = false
      this.features.set(featureName, feature)
    }
  }

  /**
   * Setzt den Rollout-Prozentsatz für ein Feature
   */
  setRolloutPercentage(featureName: keyof typeof FEATURES, percentage: number): void {
    const feature = this.features.get(featureName)
    if (feature) {
      feature.rolloutPercentage = Math.max(0, Math.min(100, percentage))
      this.features.set(featureName, feature)
    }
  }

  /**
   * Berechnet einen Hash für konsistentes Feature-Routing
   */
  private calculateHash(featureName: string, context?: Record<string, unknown>): number {
    const contextString = context ? JSON.stringify(context) : ''
    const input = `${featureName}:${contextString}`
    
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Konvertiere zu 32-bit Integer
    }
    return Math.abs(hash)
  }
} 