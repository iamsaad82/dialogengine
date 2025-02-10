import { FormExtractorImpl } from '../form'
import * as cheerio from 'cheerio'

describe('FormExtractor', () => {
  let formExtractor: FormExtractorImpl
  
  beforeEach(() => {
    formExtractor = new FormExtractorImpl()
  })

  describe('extractForms', () => {
    it('sollte Formulare mit allen Feldern extrahieren', async () => {
      const html = `
        <form id="kontaktform" action="/submit" method="POST">
          <label for="name">Name</label>
          <input type="text" id="name" name="name" required>
          
          <label for="email">E-Mail</label>
          <input type="email" id="email" name="email" required>
          
          <label for="message">Nachricht</label>
          <textarea id="message" name="message"></textarea>
          
          <button type="submit">Senden</button>
        </form>
      `
      const $ = cheerio.load(html)
      const forms = await formExtractor.extractForms($)

      expect(forms).toHaveLength(1)
      expect(forms[0]).toMatchObject({
        id: 'kontaktform',
        action: '/submit',
        method: 'POST',
        fields: expect.arrayContaining([
          {
            name: 'Name',
            type: 'text',
            required: true
          },
          {
            name: 'E-Mail',
            type: 'email',
            required: true
          },
          {
            name: 'Nachricht',
            type: 'textarea',
            required: false
          }
        ])
      })
    })

    it('sollte Validierungsmuster erkennen', async () => {
      const html = `
        <form id="registerform">
          <input type="text" 
                 name="username" 
                 pattern="[a-zA-Z0-9]{3,}"
                 required>
          <input type="tel" 
                 name="phone"
                 pattern="[0-9]{3,}"
                 data-required="true">
        </form>
      `
      const $ = cheerio.load(html)
      const forms = await formExtractor.extractForms($)

      expect(forms[0].fields).toEqual(expect.arrayContaining([
        {
          name: 'username',
          type: 'text',
          required: true,
          validation: '[a-zA-Z0-9]{3,}'
        },
        {
          name: 'phone',
          type: 'tel',
          required: true,
          validation: '[0-9]{3,}'
        }
      ]))
    })
  })

  describe('extractButtons', () => {
    it('sollte verschiedene Button-Typen erkennen', async () => {
      const html = `
        <button type="submit">Submit</button>
        <a class="button" href="/link">Link</a>
        <div role="button" onclick="doAction()">Action</div>
      `
      const $ = cheerio.load(html)
      const buttons = await formExtractor.extractButtons($)

      expect(buttons).toHaveLength(3)
      expect(buttons).toEqual(expect.arrayContaining([
        {
          id: expect.any(String),
          text: 'Submit',
          action: '',
          type: 'submit'
        },
        {
          id: expect.any(String),
          text: 'Link',
          action: '',
          type: 'link'
        },
        {
          id: expect.any(String),
          text: 'Action',
          action: 'doAction()',
          type: 'action'
        }
      ]))
    })
  })

  describe('extractMessages', () => {
    it('sollte verschiedene Nachrichtentypen erkennen', async () => {
      const html = `
        <div class="success">Operation erfolgreich</div>
        <div class="error">Ein Fehler ist aufgetreten</div>
        <div class="message">Info-Nachricht</div>
      `
      const $ = cheerio.load(html)
      const messages = await formExtractor.extractMessages($)

      expect(messages).toHaveLength(3)
      expect(messages).toEqual(expect.arrayContaining([
        {
          type: 'success',
          text: 'Operation erfolgreich',
          selector: '.success'
        },
        {
          type: 'error',
          text: 'Ein Fehler ist aufgetreten',
          selector: '.error'
        },
        {
          type: 'info',
          text: 'Info-Nachricht',
          selector: '.message'
        }
      ]))
    })
  })
}) 