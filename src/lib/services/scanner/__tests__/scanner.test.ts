import { WebsiteScanner } from '../index'
import { ContentVectorizer } from '../../vectorizer'
import { Redis } from 'ioredis'
import fetch, { Response } from 'node-fetch'
import * as fs from 'fs'
import * as path from 'path'

// Mocks
jest.mock('../../vectorizer')
jest.mock('ioredis')
jest.mock('node-fetch')
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn()
  }
}))

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('WebsiteScanner', () => {
  let scanner: WebsiteScanner
  const mockConfig = {
    openaiApiKey: 'test-openai-key',
    pineconeApiKey: 'test-pinecone-key',
    pineconeEnvironment: 'test-env',
    pineconeIndex: 'test-index',
    templateId: 'test-template',
    redisUrl: 'redis://localhost'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    scanner = new WebsiteScanner(mockConfig)
  })

  describe('Konstruktor', () => {
    it('sollte eine Instanz mit korrekter Konfiguration erstellen', () => {
      expect(() => new WebsiteScanner(mockConfig)).not.toThrow()
    })

    it('sollte Fehler werfen bei fehlenden Pflichtfeldern', () => {
      expect(() => new WebsiteScanner({
        ...mockConfig,
        pineconeEnvironment: undefined as any
      })).toThrow('pineconeEnvironment ist erforderlich')

      expect(() => new WebsiteScanner({
        ...mockConfig,
        pineconeIndex: undefined as any
      })).toThrow('pineconeIndex ist erforderlich')

      expect(() => new WebsiteScanner({
        ...mockConfig,
        templateId: undefined as any
      })).toThrow('templateId ist erforderlich')
    })
  })

  describe('scanWebsite', () => {
    const mockHtml = `
      <html>
        <head><title>Test Seite</title></head>
        <body>
          <nav class="main-menu">
            <ul>
              <li><a href="/test">Test Link</a></li>
            </ul>
          </nav>
          <main>
            <div class="process-step" data-step-id="step1">
              <h3>Test Schritt</h3>
            </div>
            <form id="testform">
              <input type="text" required>
            </form>
          </main>
        </body>
      </html>
    `

    beforeEach(() => {
      mockFetch.mockResolvedValue(Promise.resolve({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      } as Response))
    })

    it('sollte eine Website erfolgreich scannen', async () => {
      await scanner.scanWebsite('https://example.com')

      // Prüfe ob fetch aufgerufen wurde
      expect(mockFetch).toHaveBeenCalledWith('https://example.com')

      // Prüfe ob Vektorisierung durchgeführt wurde
      expect(ContentVectorizer.prototype.indexContent).toHaveBeenCalled()

      // Prüfe ob Redis-Status aktualisiert wurde
      if (mockConfig.redisUrl) {
        expect(Redis.prototype.set).toHaveBeenCalledWith(
          'scan:status',
          expect.stringContaining('"status":"completed"')
        )
      }
    })

    it('sollte Fehler behandeln', async () => {
      const error = new Error('Netzwerkfehler')
      mockFetch.mockRejectedValue(error)

      await expect(scanner.scanWebsite('https://example.com')).rejects.toThrow('Netzwerkfehler')

      if (mockConfig.redisUrl) {
        expect(Redis.prototype.set).toHaveBeenCalledWith(
          'scan:status',
          expect.stringContaining('"status":"error"')
        )
      }
    })
  })

  describe('scanMarkdownDirectory', () => {
    const mockFiles = [
      'test1.md',
      'test2.md',
      'test3.txt' // Sollte ignoriert werden
    ]

    const mockMarkdown = `
      # Test Titel
      Dies ist ein Test-Inhalt.
      ## Unterabschnitt
      Mehr Testinhalt.
    `

    beforeEach(() => {
      ;(fs.promises.readdir as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue(mockMarkdown)
    })

    it('sollte Markdown-Dateien erfolgreich scannen', async () => {
      await scanner.scanMarkdownDirectory('/test/dir')

      // Prüfe ob Dateien gelesen wurden
      expect(fs.promises.readdir).toHaveBeenCalledWith('/test/dir', { recursive: true })
      
      // Prüfe ob nur MD-Dateien verarbeitet wurden
      expect(fs.promises.readFile).toHaveBeenCalledTimes(2)

      // Prüfe ob Vektorisierung durchgeführt wurde
      expect(ContentVectorizer.prototype.indexContent).toHaveBeenCalledTimes(2)

      // Prüfe ob Redis-Status aktualisiert wurde
      if (mockConfig.redisUrl) {
        expect(Redis.prototype.set).toHaveBeenLastCalledWith(
          'scan:status',
          expect.stringContaining('"status":"completed"')
        )
      }
    })

    it('sollte Fehler behandeln', async () => {
      const error = new Error('Dateisystemfehler')
      ;(fs.promises.readdir as jest.Mock).mockRejectedValue(error)

      await expect(scanner.scanMarkdownDirectory('/test/dir')).rejects.toThrow('Dateisystemfehler')

      if (mockConfig.redisUrl) {
        expect(Redis.prototype.set).toHaveBeenCalledWith(
          'scan:status',
          expect.stringContaining('"status":"error"')
        )
      }
    })
  })

  describe('Integration der Extraktoren', () => {
    const mockHtml = `
      <html>
        <nav class="main-menu">
          <ul>
            <li><a href="/test">Test</a></li>
          </ul>
        </nav>
        <div class="process-step" data-step-id="step1">
          <h3>Prozessschritt</h3>
          <form id="testform">
            <input type="text" required>
          </form>
        </div>
      </html>
    `

    beforeEach(() => {
      mockFetch.mockResolvedValue(Promise.resolve({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      } as Response))
    })

    it('sollte alle Extraktoren korrekt integrieren', async () => {
      await scanner.scanWebsite('https://example.com')

      // Prüfe ob die Struktur korrekt aufgebaut wurde
      expect(scanner['structure']).toMatchObject({
        navigation: {
          mainMenu: expect.any(Array),
          subMenus: expect.any(Object),
          breadcrumbs: expect.any(Object)
        },
        processes: expect.any(Array),
        pages: expect.any(Array)
      })
    })
  })
}) 