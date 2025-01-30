'use server'

import { db } from '@/lib/db'
import { Template } from '@/lib/schemas/template'
import { ParsedBot } from '@/lib/types/template'

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

export async function updateTemplateBot(templateId: string, bot: ParsedBot): Promise<any> {
  try {
    // Stelle sicher, dass die templateId gesetzt ist
    const botWithTemplateId = {
      ...bot,
      templateId
    };

    // Erstelle absolute URL für den API-Endpunkt
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const apiUrl = `${baseUrl}/api/templates/${templateId}/bot`
    
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(botWithTemplateId),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Fehler beim Speichern der Bot-Konfiguration');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error updating bot:', error);
    throw new Error(error.message || 'Fehler beim Speichern der Bot-Konfiguration');
  }
} 