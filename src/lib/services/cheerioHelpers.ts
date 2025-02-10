import { CheerioAPI, CheerioSelector, CheerioElement } from '../types/cheerio'

export function findInputLabel($input: CheerioSelector): string {
  const id = $input.attr('id')
  if (id) {
    const $label = $(`label[for="${id}"]`)
    if ($label.length) return $label.text().trim()
  }
  return $input.attr('placeholder') || $input.attr('name') || ''
}

export function getMessageType($el: CheerioSelector): 'success' | 'error' | 'info' {
  const classes = $el.attr('class')?.split(' ') || []
  if (classes.includes('success')) return 'success'
  if (classes.includes('error')) return 'error'
  return 'info'
}

export function getUniqueSelector($el: CheerioSelector): string {
  const id = $el.attr('id')
  if (id) return `#${id}`
  
  const classes = $el.attr('class')?.split(' ').filter(Boolean) || []
  if (classes.length) return `.${classes.join('.')}`
  
  return $el.prop('tagName').toLowerCase()
}

export function determineButtonType($button: CheerioSelector): 'link' | 'submit' | 'action' {
  const type = $button.attr('type')
  if (type === 'submit') return 'submit'
  if ($button.is('a') || $button.attr('href')) return 'link'
  return 'action'
}

export function extractFormFields($: CheerioAPI, $form: CheerioSelector): Array<{
  name: string
  type: string
  required: boolean
  validation?: string
}> {
  const fields: Array<{
    name: string
    type: string
    required: boolean
    validation?: string
  }> = []
  
  $form.find('input, select, textarea').each((_index: number, element: CheerioElement) => {
    const $field = $(element)
    const type = $field.attr('type') || element.tagName
    const name = findInputLabel($field)
    const required = $field.attr('required') !== undefined || $field.attr('data-required') === 'true'
    const pattern = $field.attr('pattern')
    
    fields.push({
      name,
      type,
      required,
      validation: pattern
    })
  })
  
  return fields
} 