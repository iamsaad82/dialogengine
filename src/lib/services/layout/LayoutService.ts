import { prisma } from "@/lib/prisma";

export interface Layout {
    id: string;
    name: string;
    description?: string;
    config: any;
    metadata: {
        lastModified: string;
        version: number;
        [key: string]: any;
    };
}

interface TemplateMeta {
    layouts?: Layout[];
    [key: string]: any;
}

export class LayoutService {
    async getLayoutsForTemplate(templateId: string): Promise<Layout[]> {
        const template = await prisma.template.findUnique({
            where: { id: templateId },
            select: { meta: true }
        });

        if (!template) {
            throw new Error("Template nicht gefunden");
        }

        const meta = template.meta as TemplateMeta;
        return meta.layouts || [];
    }

    async createLayout(templateId: string, layoutData: Omit<Layout, "id" | "metadata">): Promise<Layout> {
        const template = await prisma.template.findUnique({
            where: { id: templateId },
            select: { meta: true }
        });

        if (!template) {
            throw new Error("Template nicht gefunden");
        }

        const meta = template.meta as TemplateMeta;
        const layouts = meta.layouts || [];

        const newLayout: Layout = {
            ...layoutData,
            id: crypto.randomUUID(),
            metadata: {
                lastModified: new Date().toISOString(),
                version: 1
            }
        };

        const updatedMeta: TemplateMeta = {
            ...meta,
            layouts: [...layouts, newLayout]
        };

        await prisma.template.update({
            where: { id: templateId },
            data: {
                meta: updatedMeta
            }
        });

        return newLayout;
    }

    async updateLayout(templateId: string, layoutData: Layout): Promise<Layout> {
        const template = await prisma.template.findUnique({
            where: { id: templateId },
            select: { meta: true }
        });

        if (!template) {
            throw new Error("Template nicht gefunden");
        }

        const meta = template.meta as TemplateMeta;
        const layouts = meta.layouts || [];
        
        const layoutIndex = layouts.findIndex(l => l.id === layoutData.id);
        if (layoutIndex === -1) {
            throw new Error("Layout nicht gefunden");
        }

        const updatedLayout: Layout = {
            ...layoutData,
            metadata: {
                ...layoutData.metadata,
                lastModified: new Date().toISOString(),
                version: (layoutData.metadata.version || 0) + 1
            }
        };

        layouts[layoutIndex] = updatedLayout;

        const updatedMeta: TemplateMeta = {
            ...meta,
            layouts
        };

        await prisma.template.update({
            where: { id: templateId },
            data: {
                meta: updatedMeta
            }
        });

        return updatedLayout;
    }

    async deleteLayout(templateId: string, layoutId: string): Promise<void> {
        const template = await prisma.template.findUnique({
            where: { id: templateId },
            select: { meta: true }
        });

        if (!template) {
            throw new Error("Template nicht gefunden");
        }

        const meta = template.meta as TemplateMeta;
        const layouts = meta.layouts || [];
        
        const filteredLayouts = layouts.filter(l => l.id !== layoutId);

        if (filteredLayouts.length === layouts.length) {
            throw new Error("Layout nicht gefunden");
        }

        const updatedMeta: TemplateMeta = {
            ...meta,
            layouts: filteredLayouts
        };

        await prisma.template.update({
            where: { id: templateId },
            data: {
                meta: updatedMeta
            }
        });
    }
}

// Erstelle eine Instanz des LayoutService
const layoutService = new LayoutService();

// Exportiere die benötigten Funktionen
export const getLayoutsForTemplate = (templateId: string) => layoutService.getLayoutsForTemplate(templateId);
export const createLayout = (templateId: string, layoutData: Omit<Layout, "id" | "metadata">) => layoutService.createLayout(templateId, layoutData);
export const updateLayout = (templateId: string, layoutData: Layout) => layoutService.updateLayout(templateId, layoutData);
export const deleteLayout = (templateId: string, layoutId: string) => layoutService.deleteLayout(templateId, layoutId); 