'use server';
import { db } from '@/lib/db';
export async function getTemplate(id) {
    try {
        const template = await db.template.findUnique({
            where: { id }
        });
        if (template && (template.type === 'NEUTRAL' || template.type === 'INDUSTRY' || template.type === 'CUSTOM')) {
            return template;
        }
        return null;
    }
    catch (error) {
        console.error('Fehler beim Laden des Templates:', error);
        return null;
    }
}
export async function updateTemplateBot(templateId, bot) {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const apiUrl = `${baseUrl}/api/templates/${templateId}/bot`;
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bot),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Fehler beim Speichern der Bot-Konfiguration');
        }
        return await response.json();
    }
    catch (error) {
        console.error('Error updating bot:', error);
        throw new Error(error.message || 'Fehler beim Speichern der Bot-Konfiguration');
    }
}
