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
      type: data.type,
      subdomain: data.subdomain,
      jsonContent: data.jsonContent || '{}',
      jsonBranding: data.jsonBranding || '{}',
      jsonBot: data.jsonBot || '{}',
      jsonMeta: data.jsonMeta || '{}'
    }
  })
  return template
}

export async function updateTemplate(id: string, data: any) {
  const template = await prisma.template.update({
    where: { id },
    data: {
      name: data.name,
      type: data.type,
      subdomain: data.subdomain,
      jsonContent: data.jsonContent,
      jsonBranding: data.jsonBranding,
      jsonBot: data.jsonBot,
      jsonMeta: data.jsonMeta
    }
  })
  return template
}

export async function deleteTemplate(id: string) {
  await prisma.template.delete({
    where: { id }
  })
  return true
} 