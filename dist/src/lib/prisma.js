import { PrismaClient } from '@prisma/client';
export const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}
export { PrismaClient };
export async function getTemplates() {
    const templates = await prisma.template.findMany();
    return templates;
}
export async function createTemplate(data) {
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
    });
    return template;
}
export async function updateTemplate(id, data) {
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
    });
    return template;
}
export async function deleteTemplate(id) {
    await prisma.template.delete({
        where: { id }
    });
    return true;
}
