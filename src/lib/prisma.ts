import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: [
      { emit: 'stdout', level: 'warn' },
      { emit: 'stdout', level: 'error' },
      { emit: 'stdout', level: 'info' }
    ],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })

  // Error Handling
  client.$on('error', (e: Error) => {
    console.error('Prisma Client Error:', e)
  })

  return client
}

// Singleton Pattern mit Verbindungsüberprüfung
const getPrismaClient = () => {
  if (process.env.NODE_ENV === 'production' && !global.prisma) {
    return new PrismaClient()
  }
  
  if (!global.prisma) {
    global.prisma = prismaClientSingleton()
  }
  
  return global.prisma
}

export const prisma = getPrismaClient()

// Verbindungstest-Funktion
export async function testConnection() {
  try {
    await prisma.$connect()
    console.log('Database connection successful')
    return true
  } catch (error) {
    console.error('Database connection error:', error)
    return false
  }
}

export async function getTemplates() {
  try {
    // Stelle sicher, dass die Verbindung besteht
    await testConnection()
    
    const templates = await prisma.template.findMany({
      orderBy: {
        updatedAt: 'desc'
      }
    })
    return templates
  } catch (error) {
    console.error('Error fetching templates:', error)
    throw error
  }
}

export async function createTemplate(data: any) {
  try {
    await testConnection()
    
    const template = await prisma.template.create({
      data: {
        name: data.name,
        type: data.type || 'NEUTRAL',
        active: data.active ?? true,
        subdomain: data.subdomain,
        branding: data.branding || {},
        config: data.config || {},
        content: data.content || { metadata: {}, sections: [] },
        description: data.description,
        handlers: data.handlers || [],
        meta: data.meta || {},
        responses: data.responses || { rules: [], templates: [] }
      }
    })
    return template
  } catch (error) {
    console.error('Error creating template:', error)
    throw error
  }
}

export async function updateTemplate(id: string, data: any) {
  try {
    await testConnection()
    
    const template = await prisma.template.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        active: data.active,
        subdomain: data.subdomain,
        branding: data.branding,
        config: data.config,
        content: data.content,
        description: data.description,
        handlers: data.handlers,
        meta: data.meta,
        responses: data.responses
      }
    })
    return template
  } catch (error) {
    console.error('Error updating template:', error)
    throw error
  }
}

export async function deleteTemplate(id: string) {
  try {
    await testConnection()
    
    await prisma.template.delete({
      where: { id }
    })
    return true
  } catch (error) {
    console.error('Error deleting template:', error)
    throw error
  }
} 