import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export async function POST(req) {
    try {
        const data = await req.json();
        // Validierung der erforderlichen Felder
        if (!data.question || data.wasAnswered === undefined || !data.templateId) {
            return NextResponse.json({ error: 'Erforderliche Felder fehlen' }, { status: 400 });
        }
        // Überprüfe, ob das Template existiert
        const template = await prisma.template.findUnique({
            where: { id: data.templateId }
        });
        if (!template) {
            return NextResponse.json({ error: 'Template nicht gefunden' }, { status: 404 });
        }
        // Speichern des Chat-Logs
        const chatLog = await prisma.chatLog.create({
            data: {
                timestamp: new Date(data.timestamp),
                question: data.question,
                answer: data.answer,
                wasAnswered: data.wasAnswered,
                matchedExampleId: data.matchedExampleId,
                templateId: data.templateId,
                sessionId: data.sessionId
            }
        });
        return NextResponse.json(chatLog);
    }
    catch (error) {
        console.error('Chat Log Error:', error);
        return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 });
    }
}
