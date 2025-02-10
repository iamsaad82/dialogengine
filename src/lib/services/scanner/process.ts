import { CheerioAPI, CheerioSelector, CheerioElement } from '../../types/cheerio'
import { Action } from '../../types/scanner'
import { ProcessExtractor, ProcessStep, ExtractorResult } from './types'
import * as cheerio from 'cheerio'
import fetch from 'node-fetch'

export class ProcessExtractorImpl implements ProcessExtractor {
  async extractProcessSteps($: CheerioAPI): Promise<ExtractorResult<ProcessStep[]>> {
    try {
      const steps: ProcessStep[] = []
      
      $('.process-step').each((_index: number, element: CheerioElement) => {
        const $step = $(element)
        const stepId = $step.attr('data-step-id')
        const orderAttr = $step.attr('data-order')
        
        if (!stepId) return // Überspringe Schritte ohne ID
        
        const order = orderAttr ? parseInt(orderAttr, 10) : steps.length + 1
        const title = $step.find('h3, .step-title').first().text().trim()
        const description = $step.find('p, .step-description').first().text().trim()
        const url = $step.find('a').first().attr('href') || ''
        
        steps.push({
          id: stepId,
          title,
          description,
          order,
          url,
          requiredInputs: this.extractRequiredInputs($, $step),
          nextSteps: this.extractNextSteps($, $step),
          actions: this.extractStepActions($, $step)
        })
      })
      
      return {
        success: true,
        data: steps.sort((a, b) => a.order - b.order)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fehler beim Extrahieren der Prozessschritte'
      }
    }
  }

  async extractProcessActions($: CheerioAPI): Promise<ExtractorResult<Action[]>> {
    try {
      const actions: Action[] = []
      
      // Formular-Aktionen
      $('form').each((_index: number, element: CheerioElement) => {
        const $form = $(element)
        const action = $form.attr('action')
        const methodAttr = $form.attr('method')
        const method = typeof methodAttr === 'string' ? methodAttr.toUpperCase() : 'GET'
        
        if (typeof action === 'string') {
          actions.push({
            type: 'form',
            target: action,
            method: method as 'GET' | 'POST',
            requiredFields: this.extractRequiredFields($, $form)
          })
        }
      })
      
      // Download-Aktionen
      $('a[href$=".pdf"], a[href$=".doc"], a[href$=".docx"]').each((_index: number, element: CheerioElement) => {
        const href = $(element).attr('href')
        if (typeof href === 'string') {
          actions.push({
            type: 'download',
            target: href,
            successIndicator: 'Download gestartet'
          })
        }
      })
      
      return {
        success: true,
        data: actions
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fehler beim Extrahieren der Prozessaktionen'
      }
    }
  }

  private extractRequiredInputs($: CheerioAPI, $step: CheerioSelector): string[] {
    const inputs: string[] = []
    
    $step.find('input[required], select[required], textarea[required]').each((_index: number, element: CheerioElement) => {
      const $input = $(element)
      const label = this.findInputLabel($, $input)
      if (label) inputs.push(label)
    })
    
    return inputs
  }

  private extractNextSteps($: CheerioAPI, $step: CheerioSelector): string[] {
    const nextSteps: string[] = []
    
    $step.find('a[data-next-step]').each((_index: number, element: CheerioElement) => {
      const nextStep = $(element).attr('data-next-step')
      if (nextStep) nextSteps.push(nextStep)
    })
    
    return nextSteps
  }

  private extractStepActions($: CheerioAPI, $step: CheerioSelector): Action[] {
    const actions: Action[] = []
    
    // Formular-Aktionen
    $step.find('form').each((_index: number, element: CheerioElement) => {
      const $form = $(element)
      const action = $form.attr('action')
      const method = $form.attr('method')?.toUpperCase() as 'GET' | 'POST' | undefined
      
      if (action) {
        const fields = this.extractRequiredFields($, $form)
        actions.push({
          type: 'form',
          target: action,
          method: method || 'POST',
          requiredFields: fields,
          successIndicator: '.success-message'
        })
      }
    })
    
    // Download-Aktionen
    $step.find('a[href$=".pdf"], a[href$=".doc"], a[href$=".docx"]').each((_index: number, element: CheerioElement) => {
      const $link = $(element)
      const href = $link.attr('href')
      
      if (href) {
        actions.push({
          type: 'download',
          target: href,
          successIndicator: 'Download gestartet'
        })
      }
    })
    
    // Login-Aktionen
    $step.find('form[action*="login"]').each((_index: number, element: CheerioElement) => {
      const $form = $(element)
      const action = $form.attr('action')
      
      if (action) {
        const fields = this.extractRequiredFields($, $form)
        actions.push({
          type: 'login',
          target: action,
          method: 'POST',
          requiredFields: fields,
          successIndicator: '.login-success'
        })
      }
    })
    
    return actions
  }

  private findInputLabel($: CheerioAPI, $input: CheerioSelector): string {
    // Versuche zuerst ein explizites Label zu finden
    const id = $input.attr('id')
    if (id) {
      const $label = $(`label[for="${id}"]`)
      if ($label.length) return $label.text().trim()
    }
    
    // Suche nach einem übergeordneten Label
    const $parentLabel = $input.closest('label')
    if ($parentLabel.length) {
      // Entferne alle HTML-Tags und hole nur den Text
      const labelText = $parentLabel.text().replace(/<[^>]*>/g, '').trim()
      if (labelText) return labelText
    }
    
    // Fallback auf andere Attribute
    return (
      $input.attr('aria-label') ||
      $input.attr('placeholder') ||
      $input.attr('name') ||
      ''
    )
  }

  private extractRequiredFields($: CheerioAPI, $form: CheerioSelector): Array<{
    name: string
    type: string
    required: boolean
  }> {
    const fields: Array<{
      name: string
      type: string
      required: boolean
    }> = []
    
    $form.find('input, select, textarea').each((_index: number, element: CheerioElement) => {
      const $field = $(element)
      const type = $field.attr('type') || element.name
      const name = this.findInputLabel($, $field)
      const required = $field.attr('required') !== undefined || $field.attr('data-required') === 'true'
      
      fields.push({
        name,
        type,
        required
      })
    })
    
    return fields
  }

  private generateProcessId(url: string): string {
    return Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '')
  }

  private async fetchAndParse(url: string): Promise<CheerioAPI> {
    const response = await fetch(url)
    const html = await response.text()
    return cheerio.load(html) as unknown as CheerioAPI
  }

  async analyzeProcess(url: string): Promise<ExtractorResult<{
    id: string
    name: string
    steps: Array<{
      id: string
      url: string
      title: string
      requiredInputs: string[]
      nextSteps: string[]
      actions: Action[]
    }>
  }>> {
    try {
      const $ = await this.fetchAndParse(url)
      const processId = this.generateProcessId(url)
      const processName = $('h1').first().text().trim()
      
      const stepsResult = await this.extractProcessSteps($)
      if (!stepsResult.success || !stepsResult.data) {
        throw new Error(stepsResult.error || 'Keine Prozessschritte gefunden')
      }
      
      return {
        success: true,
        data: {
          id: processId,
          name: processName,
          steps: stepsResult.data
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fehler bei der Prozessanalyse'
      }
    }
  }
} 