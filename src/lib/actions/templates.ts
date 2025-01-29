import { db } from '@/lib/db'
import { Template } from '@/lib/schemas/template'

export async function getTemplate(id: string): Promise<Template | null> {
  try {
    const template = await db.template.findUnique({
      where: { id }
    })
    if (template && (template.type === 'NEUTRAL' || template.type === 'INDUSTRY' || template.type === 'CUSTOM')) {
      return template as Template
    }
    return null
  } catch (error) {
    console.error('Fehler beim Laden des Templates:', error)
    return null
  }
}

export async function updateTemplateBot(id: string, bot: any) {
  try {
    const template = await db.template.update({
      where: { id },
      data: {
        jsonBot: JSON.stringify(bot)
      }
    })
    return template
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Bots:', error)
    throw error
  }
} 