import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export async function GET() {
    try {
        const templates = await prisma.template.findMany();
        return NextResponse.json(templates);
    }
    catch (error) {
        console.error('GET error:', error);
        return NextResponse.json({ error: "Fehler beim Laden der Templates" }, { status: 500 });
    }
}
export async function POST(req) {
    try {
        const data = await req.json();
        const template = await prisma.template.create({
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
        return NextResponse.json(template);
    }
    catch (error) {
        console.error('POST error:', error);
        return NextResponse.json({ error: "Fehler beim Erstellen des Templates" }, { status: 500 });
    }
}
export async function PUT(req) {
    try {
        const data = await req.json();
        const template = await prisma.template.update({
            where: { id: data.id },
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
        return NextResponse.json(template);
    }
    catch (error) {
        console.error('PUT error:', error);
        return NextResponse.json({ error: "Fehler beim Aktualisieren des Templates" }, { status: 500 });
    }
}
export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: "ID ist erforderlich" }, { status: 400 });
        }
        await prisma.template.delete({
            where: { id }
        });
        return NextResponse.json({ success: true });
    }
    catch (error) {
        console.error('DELETE error:', error);
        return NextResponse.json({ error: "Fehler beim Löschen des Templates" }, { status: 500 });
    }
}
