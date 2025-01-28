import { db } from '@/lib/db'
import { Template } from '@/lib/schemas/template'

export async function getTemplate(id: string): Promise<Template | null> {
  try {
    const template = await db.template.findUnique({
      where: { id }
    })
    return template
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