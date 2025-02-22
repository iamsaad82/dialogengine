import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { DocumentTypeConfig } from '@/lib/types/documentTypes'

export async function PUT(
  request: Request,
  { params }: { params: { templateId: string; typeId: string } }
) {
  try {
    const body = await request.json() as DocumentTypeConfig
    
    const documentType = await prisma.documentType.update({
      where: {
        id: params.typeId,
        templateId: params.templateId
      },
      data: {
        name: body.name,
        description: body.description,
        type: body.type,
        patterns: JSON.stringify(body.patterns),
        metadata: JSON.stringify(body.metadata),
        validation: JSON.stringify(body.validation),
        responseConfig: JSON.stringify(body.responseConfig)
      }
    })

    return NextResponse.json({
      ...documentType,
      patterns: body.patterns,
      metadata: body.metadata,
      validation: body.validation,
      responseConfig: body.responseConfig
    })
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Dokumententyps:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Dokumententyps' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { templateId: string; typeId: string } }
) {
  try {
    await prisma.documentType.delete({
      where: {
        id: params.typeId,
        templateId: params.templateId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Löschen des Dokumententyps:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Dokumententyps' },
      { status: 500 }
    )
  }
} 