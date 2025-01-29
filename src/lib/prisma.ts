import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export { prisma }

export async function getTemplates() {
  const templates = await prisma.template.findMany()
  return templates
}

export async function createTemplate(data: any) {
  const template = await prisma.template.create({
    data: {
      name: data.name,
      content: data.content
    }
  })
  return template
}

export async function updateTemplate(id: string, data: any) {
  const template = await prisma.template.update({
    where: {
      id: id
    },
    data: {
      name: data.name,
      content: data.content
    }
  })
  return template
}

export async function deleteTemplate(id: string) {
  await prisma.template.delete({
    where: {
      id: id
    }
  })
  return true
} 