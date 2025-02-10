import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) {
            return NextResponse.json({ error: 'Keine Datei gefunden' }, { status: 400 });
        }
        // Validierung
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Nur Bilder sind erlaubt' }, { status: 400 });
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB
            return NextResponse.json({ error: 'Datei ist zu groß (max. 2MB)' }, { status: 400 });
        }
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        // Ensure uploads directory exists
        const uploadsDir = join(process.cwd(), 'public', 'uploads');
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
        }
        // Generate unique filename
        const uniqueId = Math.random().toString(36).substring(2, 15);
        const originalName = file.name.toLowerCase().replace(/[^a-z0-9.]/g, '-');
        const filename = `${uniqueId}-${originalName}`;
        const filepath = join(uploadsDir, filename);
        // Write file
        await writeFile(filepath, buffer);
        // Return the URL that can be used to access the file
        return NextResponse.json({ url: `/uploads/${filename}` });
    }
    catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload fehlgeschlagen' }, { status: 500 });
    }
}
