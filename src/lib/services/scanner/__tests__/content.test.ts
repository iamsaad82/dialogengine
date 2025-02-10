import { ContentExtractorImpl } from '../content'

describe('ContentExtractor', () => {
  let contentExtractor: ContentExtractorImpl
  
  beforeEach(() => {
    contentExtractor = new ContentExtractorImpl()
  })

  describe('extractContent', () => {
    it('sollte Titel und Hauptinhalt aus HTML extrahieren', () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="OpenGraph Titel">
            <title>Seitentitel</title>
          </head>
          <body>
            <header>
              <nav>Navigation</nav>
            </header>
            <main>
              <h1>Hauptüberschrift</h1>
              <p>Hauptinhalt der Seite</p>
            </main>
            <footer>
              <p>Footer</p>
            </footer>
          </body>
        </html>
      `
      const result = contentExtractor.extractContent(html)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.title).toBe('OpenGraph Titel')
      expect(result.data?.content).toContain('Hauptinhalt der Seite')
      expect(result.data?.content).not.toContain('Navigation')
      expect(result.data?.content).not.toContain('Footer')
    })

    it('sollte Fallback-Titel in der richtigen Reihenfolge verwenden', () => {
      const html = `
        <html>
          <head>
            <title>Seitentitel</title>
          </head>
          <body>
            <h1>Hauptüberschrift</h1>
          </body>
        </html>
      `
      const result = contentExtractor.extractContent(html)
      expect(result.success).toBe(true)
      expect(result.data?.title).toBe('Seitentitel')

      const htmlOhneTitle = `
        <html>
          <body>
            <h1>Hauptüberschrift</h1>
          </body>
        </html>
      `
      const resultOhneTitle = contentExtractor.extractContent(htmlOhneTitle)
      expect(resultOhneTitle.success).toBe(true)
      expect(resultOhneTitle.data?.title).toBe('Hauptüberschrift')
    })

    it('sollte den größten Textblock finden wenn kein main/article Element existiert', () => {
      const html = `
        <html>
          <body>
            <div class="small">Kleiner Text</div>
            <div class="large">
              Dies ist ein längerer Text der als Hauptinhalt erkannt werden sollte.
              Er enthält mehrere Sätze und sollte daher als größter Textblock
              identifiziert werden.
            </div>
            <div class="small">Noch ein kleiner Text</div>
          </body>
        </html>
      `
      const result = contentExtractor.extractContent(html)
      expect(result.success).toBe(true)
      expect(result.data?.content).toContain('längerer Text')
      expect(result.data?.content).toContain('Hauptinhalt')
    })

    it('sollte Fehler behandeln und ein entsprechendes Ergebnis zurückgeben', () => {
      const result = contentExtractor.extractContent('<invalid>html')
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('extractTitle', () => {
    it('sollte verschiedene Markdown-Überschriftenformate erkennen', () => {
      const formats = [
        {
          input: '# Haupttitel\nInhalt',
          expected: 'Haupttitel'
        },
        {
          input: 'Haupttitel\n=========\nInhalt',
          expected: 'Haupttitel'
        },
        {
          input: '=== Haupttitel ===\nInhalt',
          expected: 'Haupttitel'
        }
      ]

      formats.forEach(({ input, expected }) => {
        const title = contentExtractor.extractTitle(input)
        expect(title).toBe(expected)
      })
    })

    it('sollte die erste nicht-leere Zeile als Fallback verwenden', () => {
      const content = '\n\nDies ist der Titel\nUnd hier kommt der Inhalt'
      const title = contentExtractor.extractTitle(content)
      expect(title).toBe('Dies ist der Titel')
    })

    it('sollte "Untitled" zurückgeben wenn kein Titel gefunden wurde', () => {
      const title = contentExtractor.extractTitle('')
      expect(title).toBe('Untitled')
    })
  })

  describe('cleanMarkdown', () => {
    it('sollte verschiedene Markdown-Elemente entfernen', () => {
      const markdown = `
        ---
        title: Frontmatter Titel
        ---
        # Überschrift
        
        [Link](https://example.com)
        ![Bild](bild.jpg)
        
        \`\`\`typescript
        const code = true;
        \`\`\`
        
        Text mit \`inline code\` und **Formatierung**
        
        ---
        
        Weiterer Text
      `
      const cleaned = contentExtractor.cleanMarkdown(markdown)

      expect(cleaned).not.toContain('---')
      expect(cleaned).not.toContain('Frontmatter')
      expect(cleaned).not.toContain('#')
      expect(cleaned).not.toContain('![')
      expect(cleaned).not.toContain('](')
      expect(cleaned).not.toContain('```')
      expect(cleaned).not.toContain('inline code')
      expect(cleaned).toContain('Link')
      expect(cleaned).toContain('Text mit')
      expect(cleaned).toContain('Weiterer Text')
    })

    it('sollte HTML-Tags entfernen', () => {
      const markdown = 'Text mit <strong>HTML</strong> und <a href="#">Links</a>'
      const cleaned = contentExtractor.cleanMarkdown(markdown)
      expect(cleaned).toBe('Text mit HTML und Links')
    })
  })

  describe('determineType', () => {
    it('sollte medizinische Inhalte erkennen', () => {
      const content = 'Diese Behandlung und Therapie hilft bei der Diagnose von Symptomen.'
      const type = contentExtractor.determineType(content)
      expect(type).toBe('medical')
    })

    it('sollte Versicherungsinhalte erkennen', () => {
      const content = 'Informationen zur Versicherung und Leistungen mit Tarifen und Beiträgen.'
      const type = contentExtractor.determineType(content)
      expect(type).toBe('insurance')
    })

    it('sollte Service-Inhalte erkennen', () => {
      const content = 'Unsere Beratung und Termine für Ihre Sprechstunde.'
      const type = contentExtractor.determineType(content)
      expect(type).toBe('service')
    })

    it('sollte FAQ-Inhalte erkennen', () => {
      const content = 'Häufige Fragen zu unseren Leistungen.'
      const type = contentExtractor.determineType(content)
      expect(type).toBe('faq')
    })

    it('sollte Formular-Inhalte erkennen', () => {
      const content = 'Bitte füllen Sie das Antragsformular aus.'
      const type = contentExtractor.determineType(content)
      expect(type).toBe('form')
    })

    it('sollte Prozess-Inhalte erkennen', () => {
      const content = 'Der Ablauf des Prozesses erfolgt in mehreren Schritten.'
      const type = contentExtractor.determineType(content)
      expect(type).toBe('process')
    })

    it('sollte info als Standard-Typ zurückgeben', () => {
      const content = 'Allgemeiner Text ohne spezifische Schlüsselwörter'
      const type = contentExtractor.determineType(content)
      expect(type).toBe('info')
    })

    it('sollte den Typ mit dem höchsten Score wählen', () => {
      const content = 'Dieser Text enthält Versicherung und Tarif (insurance) ' +
                     'aber auch eine Behandlung (medical). ' +
                     'Versicherung Versicherung Versicherung' // Mehr Insurance-Keywords
      const type = contentExtractor.determineType(content)
      expect(type).toBe('insurance') // Sollte insurance sein wegen höherem Score
    })
  })

  describe('determineContentType', () => {
    it('sollte das gleiche Ergebnis wie determineType liefern', () => {
      const content = 'Test Content'
      const type1 = contentExtractor.determineType(content)
      const type2 = contentExtractor.determineContentType(content)
      expect(type1).toBe(type2)
    })
  })
}) 