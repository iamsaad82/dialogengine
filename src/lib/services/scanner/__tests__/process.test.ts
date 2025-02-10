import { ProcessExtractorImpl } from '../process'
import * as cheerio from 'cheerio'
import { CheerioAPI } from '../../../types/cheerio'

describe('ProcessExtractor', () => {
  let processExtractor: ProcessExtractorImpl
  
  beforeEach(() => {
    processExtractor = new ProcessExtractorImpl()
  })

  describe('extractProcessSteps', () => {
    it('sollte Prozessschritte mit allen Details extrahieren', async () => {
      const html = `
        <div class="process-step" data-step-id="step1" data-order="1">
          <h3>Antrag ausfüllen</h3>
          <p class="step-description">Füllen Sie das Antragsformular vollständig aus.</p>
          <form>
            <label for="name">Name</label>
            <input type="text" id="name" required>
            <label for="email">E-Mail</label>
            <input type="email" id="email" required>
            <button type="submit">Absenden</button>
          </form>
          <a data-next-step="step2" href="/step2">Weiter zu Schritt 2</a>
        </div>
        <div class="process-step" data-step-id="step2" data-order="2">
          <h3>Unterlagen einreichen</h3>
          <p class="step-description">Reichen Sie die erforderlichen Unterlagen ein.</p>
          <a href="form.pdf" class="document">Formular herunterladen</a>
          <a data-next-step="step3" href="/step3">Weiter zu Schritt 3</a>
        </div>
      `
      const $ = cheerio.load(html) as unknown as CheerioAPI
      const result = await processExtractor.extractProcessSteps($)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data?.[0]).toMatchObject({
        id: 'step1',
        title: 'Antrag ausfüllen',
        description: 'Füllen Sie das Antragsformular vollständig aus.',
        order: 1,
        requiredInputs: ['Name', 'E-Mail'],
        nextSteps: ['step2'],
        actions: expect.arrayContaining([
          {
            type: 'form',
            target: expect.any(String)
          }
        ])
      })
      expect(result.data?.[1]).toMatchObject({
        id: 'step2',
        title: 'Unterlagen einreichen',
        description: 'Reichen Sie die erforderlichen Unterlagen ein.',
        order: 2,
        nextSteps: ['step3'],
        actions: expect.arrayContaining([
          {
            type: 'download',
            target: 'form.pdf'
          }
        ])
      })
    })
  })

  describe('extractProcessActions', () => {
    it('sollte verschiedene Aktionstypen erkennen', async () => {
      const html = `
        <div class="process-actions">
          <form action="/submit" method="POST">
            <input type="text" name="name" required>
            <button type="submit">Absenden</button>
          </form>
          <a href="document.pdf">Download</a>
          <form action="/login" method="POST">
            <input type="email" name="email" required>
            <input type="password" name="password" required>
            <button type="submit">Login</button>
          </form>
        </div>
      `
      const $ = cheerio.load(html) as unknown as CheerioAPI
      const result = await processExtractor.extractProcessActions($)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(3)
      expect(result.data).toEqual(expect.arrayContaining([
        {
          type: 'form',
          target: '/submit',
          method: 'POST',
          requiredFields: expect.arrayContaining([
            {
              name: 'name',
              type: 'text',
              required: true
            }
          ])
        },
        {
          type: 'download',
          target: 'document.pdf',
          successIndicator: 'Download gestartet'
        },
        {
          type: 'login',
          target: '/login',
          method: 'POST',
          requiredFields: expect.arrayContaining([
            {
              name: 'email',
              type: 'email',
              required: true
            },
            {
              name: 'password',
              type: 'password',
              required: true
            }
          ])
        }
      ]))
    })
  })

  describe('analyzeProcess', () => {
    it('sollte einen vollständigen Prozess analysieren', async () => {
      // Mock für fetchAndParse
      const mockHtml = `
        <h1>Antragsverfahren</h1>
        <div class="process-step" data-step-id="step1" data-order="1">
          <h3>Schritt 1</h3>
          <p>Beschreibung 1</p>
          <form action="/submit1">
            <input type="text" name="field1" required>
          </form>
        </div>
        <div class="process-step" data-step-id="step2" data-order="2">
          <h3>Schritt 2</h3>
          <p>Beschreibung 2</p>
          <a href="doc.pdf">Download</a>
        </div>
      `
      const mockFetchAndParse = jest.spyOn(processExtractor as any, 'fetchAndParse')
      mockFetchAndParse.mockResolvedValue(cheerio.load(mockHtml) as unknown as CheerioAPI)

      const result = await processExtractor.analyzeProcess('https://example.com/process')

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: expect.any(String),
        name: 'Antragsverfahren',
        steps: expect.arrayContaining([
          {
            id: expect.stringContaining('step1'),
            title: 'Schritt 1',
            requiredInputs: ['field1'],
            actions: expect.arrayContaining([
              {
                type: 'form',
                target: '/submit1'
              }
            ])
          },
          {
            id: expect.stringContaining('step2'),
            title: 'Schritt 2',
            actions: expect.arrayContaining([
              {
                type: 'download',
                target: 'doc.pdf'
              }
            ])
          }
        ])
      })

      mockFetchAndParse.mockRestore()
    })
  })
}) 