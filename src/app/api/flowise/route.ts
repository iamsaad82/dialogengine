import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/flowise
export async function GET() {
  const configs = await prisma.flowiseConfig.findMany()
  return NextResponse.json(configs)
}

// POST /api/flowise
export async function POST(request: Request) {
  const body = await request.json()
  
  const config = await prisma.flowiseConfig.create({
    data: {
      name: body.name,
      apiHost: body.apiHost,
      chatflowId: body.chatflowId,
      apiKey: body.apiKey
    }
  })

  return NextResponse.json(config)
}

// PUT /api/flowise/:id
export async function PUT(request: Request) {
  const body = await request.json()

  const config = await prisma.flowiseConfig.update({
    where: { id: body.id },
    data: {
      name: body.name,
      apiHost: body.apiHost,
      chatflowId: body.chatflowId,
      apiKey: body.apiKey
    }
  })

  return NextResponse.json(config)
}

// DELETE /api/flowise/:id
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return new NextResponse("Missing id", { status: 400 })
  }

  await prisma.flowiseConfig.delete({
    where: { id }
  })

  return new NextResponse(null, { status: 204 })
} 