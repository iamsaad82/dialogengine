import { describe, expect, test, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'
import { RedisClient } from '../../src/lib/redis'
import { ScanStatus } from '../../src/types'

describe('Redis Integration', () => {
  let client: RedisClient

  beforeEach(async () => {
    client = new RedisClient(process.env.REDIS_TEST_URL || 'redis://localhost:6379')
    await client.connect()
  })

  afterEach(async () => {
    await client.disconnect()
  })

  test('sollte sich mit Redis verbinden können', async () => {
    await expect(client.testConnection()).resolves.not.toThrow()
  })

  test('sollte einen Scan-Status speichern und abrufen können', async () => {
    const scanId = 'test-123'
    const status: ScanStatus = {
      totalFiles: 10,
      processedFiles: 5,
      status: 'IN_PROGRESS',
      errors: []
    }

    await client.setScanStatus(scanId, status)
    const retrievedStatus = await client.getScanStatus(scanId)

    expect(retrievedStatus).toEqual(status)
  })

  test('sollte null zurückgeben für nicht existierenden Scan-Status', async () => {
    const nonExistentId = 'non-existent'
    const status = await client.getScanStatus(nonExistentId)
    expect(status).toBeNull()
  })

  test('sollte einen Scan-Status mit TTL setzen können', async () => {
    const scanId = 'test-456'
    const status: ScanStatus = {
      totalFiles: 3,
      processedFiles: 1,
      status: 'IN_PROGRESS',
      errors: []
    }
    const ttl = 1 // 1 Sekunde

    await client.setScanStatus(scanId, status, ttl)
    const immediateStatus = await client.getScanStatus(scanId)
    expect(immediateStatus).toEqual(status)

    // Warte auf TTL-Ablauf
    await new Promise(resolve => setTimeout(resolve, 1100))
    const expiredStatus = await client.getScanStatus(scanId)
    expect(expiredStatus).toBeNull()
  })

  it('sollte Daten speichern und abrufen können', async () => {
    const key = 'test-key'
    const value = { data: 'test-value' }

    await client.set(key, JSON.stringify(value))
    const result = await client.get(key)

    expect(JSON.parse(result as string)).toEqual(value)
  })
}) 