import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getResponseConfig } from '@/config/responseConfig'

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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { question, history, flowiseId, templateId } = body

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID fehlt' }, { status: 400 })
    }

    // Hole die Flowise-Konfiguration
    const flowiseConfig = await prisma.flowiseConfig.findFirst()
    if (!flowiseConfig) {
      return NextResponse.json({ error: 'Flowise nicht konfiguriert' }, { status: 400 })
    }

    // Baue die Flowise-URL zusammen
    const flowiseUrl = `${flowiseConfig.url}/api/v1/prediction/${flowiseId}`

    // Sende Anfrage an Flowise
    const response = await fetch(flowiseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(flowiseConfig.apiKey ? { 'Authorization': `Bearer ${flowiseConfig.apiKey}` } : {})
      },
      body: JSON.stringify({
        question,
        history
      })
    })

    if (!response.ok) {
      throw new Error('Flowise-Anfrage fehlgeschlagen')
    }

    const flowiseResponse = await response.json()
    
    // Formatiere die Antwort mit Template-Kontext
    const formattedResponse = await formatResponse(flowiseResponse, templateId)
    
    return NextResponse.json(formattedResponse)
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 