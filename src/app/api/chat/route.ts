import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getResponseConfig } from '@/config/responseConfig'
import { SmartSearchHandler } from '@/lib/services/smartSearch'
import { z } from 'zod'

interface FlowiseResponse {
  text: string
}

interface TemplateMeta {
  domain: string
  contactUrl?: string
  servicesUrl?: string
}

interface ResponseMetadata {
  type?: string;
  url?: string;
  buttonText?: string;
}

interface DetectedContact {
  type: 'email' | 'phone' | 'url';
  url: string;
  buttonText: string;
}

function extractButtons(text: string): DetectedContact[] {
  const buttons: DetectedContact[] = [];
  
  // E-Mail erkennen
  if (text.includes('mailto:')) {
    buttons.push({
      type: 'email',
      url: 'mailto:hallo@schickma.de',
      buttonText: 'E-Mail schreiben'
    });
  }
  
  // Telefon erkennen
  if (text.includes('tel:')) {
    buttons.push({
      type: 'phone',
      url: 'tel:+492018579270',
      buttonText: 'Anrufen'
    });
  }
  
  // Kontaktformular erkennen
  if (text.includes('/kontakt')) {
    buttons.push({
      type: 'url',
      url: 'https://sawatzki-muehlenbruch.de/kontakt/',
      buttonText: 'Zum Kontaktformular'
    });
  }
  
  return buttons;
}

function formatContactInfo(text: string): { formattedText: string; buttons: DetectedContact[] } {
  const buttons: DetectedContact[] = [];
  let formattedText = text;

  // E-Mail erkennen und formatieren
  const emailRegex = /\d+\.\s*Per E-Mail an\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  formattedText = formattedText.replace(emailRegex, (match, email) => {
    buttons.push({
      type: 'email',
      url: `mailto:${email}`,
      buttonText: 'E-Mail schreiben'
    });
    return `1. Per E-Mail an [${email}](mailto:${email})`;
  });

  // Telefonnummer erkennen und formatieren
  const phoneRegex = /\d+\.\s*Telefonisch unter\s*(\+\d{1,4}\s*[\d\s/\-]+\d)/gi;
  formattedText = formattedText.replace(phoneRegex, (match, phone) => {
    const cleanNumber = phone.replace(/[\s\-\/]/g, '');
    buttons.push({
      type: 'phone',
      url: `tel:${cleanNumber}`,
      buttonText: 'Anrufen'
    });
    return `2. Telefonisch unter [${phone}](tel:${cleanNumber})`;
  });

  // Kontaktformular ist bereits korrekt formatiert, extrahiere nur den Button
  if (formattedText.includes('/kontakt/')) {
    buttons.push({
      type: 'url',
      url: 'https://sawatzki-muehlenbruch.de/kontakt/',
      buttonText: 'Zum Kontaktformular'
    });
  }

  return { formattedText, buttons };
}

async function formatResponse(flowiseResponse: FlowiseResponse, templateId: string) {
  const template = await prisma.template.findUnique({
    where: { id: templateId }
  });

  if (!template) {
    return {
      text: flowiseResponse.text,
      type: 'info'
    };
  }

  // Formatiere den Text und extrahiere die Buttons
  const { formattedText, buttons } = formatContactInfo(flowiseResponse.text);
  
  // Setze die Metadaten basierend auf dem ersten Button
  const metadata: ResponseMetadata = buttons.length > 0 ? {
    type: 'contact',
    url: buttons[0].url,
    buttonText: buttons[0].buttonText
  } : {};
  
  // Stelle sicher, dass alle Buttons zurückgegeben werden
  return {
    text: formattedText,
    type: metadata.type || 'info',
    metadata,
    additionalButtons: buttons.filter(btn => btn.url !== metadata.url) // Filtere den Haupt-Button aus den zusätzlichen Buttons
  };
}

const chatRequestSchema = z.object({
  question: z.string().min(1),
  templateId: z.string(),
  sessionId: z.string(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional()
})

// Überprüfe Umgebungsvariablen beim Start
if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY) {
  throw new Error('Erforderliche Umgebungsvariablen fehlen')
}

// Typsichere Umgebungsvariablen
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const PINECONE_API_KEY = process.env.PINECONE_API_KEY
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT || 'europe-west4'
const PINECONE_HOST = process.env.PINECONE_HOST || ''
const PINECONE_INDEX = process.env.PINECONE_INDEX || 'dialog-engine'
const REDIS_URL = process.env.REDIS_URL

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = chatRequestSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Ungültige Anfrage: ' + result.error.message },
        { status: 400 }
      )
    }

    const { question, templateId } = result.data

    const searchHandler = new SmartSearchHandler({
      openaiApiKey: OPENAI_API_KEY,
      pineconeApiKey: PINECONE_API_KEY,
      pineconeEnvironment: PINECONE_ENVIRONMENT,
      pineconeHost: PINECONE_HOST,
      pineconeIndex: PINECONE_INDEX,
      redisUrl: REDIS_URL,
      templateId
    })

    const response = await searchHandler.handleQuery(question)
    return NextResponse.json(response)
  } catch (error) {
    console.error('Fehler bei der Suche:', error)
    return NextResponse.json(
      { error: 'Fehler bei der Suche' },
      { status: 500 }
    )
  }
} 