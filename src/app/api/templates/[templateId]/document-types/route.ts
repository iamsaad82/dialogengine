import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { CreateDocumentTypeConfig } from '@/lib/types/documentTypes';
import { Prisma } from '@prisma/client';

export async function GET(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    // Prüfe zuerst, ob das Template existiert
    const template = await prisma.template.findUnique({
      where: { id: params.templateId }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template nicht gefunden' },
        { status: 404 }
      );
    }

    // Hole die DocumentTypes für dieses Template
    const documentTypes = await prisma.documentType.findMany({
      where: { templateId: params.templateId },
      orderBy: { createdAt: 'desc' }
    });

    // Parse die JSON-Felder für jedes Dokument
    const parsedDocumentTypes = documentTypes.map(type => ({
      ...type,
      patterns: JSON.parse(type.patterns as string),
      metadata: JSON.parse(type.metadata as string),
      validation: JSON.parse(type.validation as string),
      responseConfig: JSON.parse(type.responseConfig as string)
    }));

    return NextResponse.json(parsedDocumentTypes);
  } catch (error) {
    console.error('Fehler beim Laden der Dokumententypen:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const body = await request.json() as CreateDocumentTypeConfig;

    // Prüfe zuerst, ob das Template existiert
    const template = await prisma.template.findUnique({
      where: { id: params.templateId }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template nicht gefunden' },
        { status: 404 }
      );
    }

    // Erstelle den neuen DocumentType mit Prisma Client
    const documentType = await prisma.documentType.create({
      data: {
        templateId: params.templateId,
        name: body.name,
        description: body.description,
        type: body.type,
        patterns: JSON.stringify(body.patterns || []),
        metadata: JSON.stringify(body.metadata || {}),
        validation: JSON.stringify(body.validation || {
          schemas: [],
          handlers: [],
          rules: []
        }),
        responseConfig: JSON.stringify(body.responseConfig || {
          layouts: [],
          defaultLayout: '',
          conditions: []
        })
      }
    });

    // Parse die JSON-Felder zurück für die Antwort
    return NextResponse.json({
      ...documentType,
      patterns: JSON.parse(documentType.patterns as string),
      metadata: JSON.parse(documentType.metadata as string),
      validation: JSON.parse(documentType.validation as string),
      responseConfig: JSON.parse(documentType.responseConfig as string)
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Dokumententyps:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
} 