import { CheerioAPI, CheerioSelector, CheerioElement } from '../../types/cheerio'
import { FormExtractor, FormInfo, ButtonInfo, MessageInfo, ExtractorResult } from './types'
import {
  findInputLabel,
  getMessageType,
  getUniqueSelector,
  determineButtonType,
  extractFormFields
} from '../cheerioHelpers'

export class FormExtractorImpl implements FormExtractor {
  async extractForms($: CheerioAPI): Promise<ExtractorResult<FormInfo[]>> {
    try {
      const forms: FormInfo[] = []
      
      $('form').each((_index: number, element: CheerioElement) => {
        const $form = $(element)
        const formId = $form.attr('id')
        const formAction = $form.attr('action')
        const formMethod = $form.attr('method')
        
        forms.push({
          id: typeof formId === 'string' ? formId : `form_${forms.length + 1}`,
          fields: extractFormFields($, $form),
          action: typeof formAction === 'string' ? formAction : '',
          method: typeof formMethod === 'string' ? formMethod.toUpperCase() : 'POST'
        })
      })
      
      return {
        success: true,
        data: forms
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fehler beim Extrahieren der Formulare'
      }
    }
  }

  async extractButtons($: CheerioAPI): Promise<ExtractorResult<ButtonInfo[]>> {
    try {
      const buttons: ButtonInfo[] = []
      
      $('button, .button, [role="button"]').each((_index: number, element: CheerioElement) => {
        const $button = $(element)
        const buttonId = $button.attr('id')
        const buttonAction = $button.attr('onclick')
        
        buttons.push({
          id: typeof buttonId === 'string' ? buttonId : `button_${buttons.length + 1}`,
          text: $button.text().trim(),
          action: typeof buttonAction === 'string' ? buttonAction : '',
          type: determineButtonType($button)
        })
      })
      
      return {
        success: true,
        data: buttons
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fehler beim Extrahieren der Buttons'
      }
    }
  }

  async extractMessages($: CheerioAPI): Promise<ExtractorResult<MessageInfo[]>> {
    try {
      const messages: MessageInfo[] = []
      
      $('.success, .error, .message, .notification').each((_index: number, element: CheerioElement) => {
        const $msg = $(element)
        messages.push({
          type: getMessageType($msg),
          text: $msg.text().trim(),
          selector: getUniqueSelector($msg)
        })
      })
      
      return {
        success: true,
        data: messages
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fehler beim Extrahieren der Nachrichten'
      }
    }
  }
} 