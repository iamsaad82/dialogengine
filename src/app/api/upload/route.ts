import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'Keine Datei gefunden' },
        { status: 400 }
      );
    }

    // Validierung des MIME-Types und der Dateiendung
    const fileType = file.type.toLowerCase();
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    const isValidMimeType = ALLOWED_IMAGE_TYPES.includes(fileType);
    const isValidExtension = ALLOWED_EXTENSIONS.includes(extension);
    
    if (!isValidMimeType && !isValidExtension) {
      return NextResponse.json(
        { error: 'Nur Bilder im Format JPG, JPEG, PNG oder WebP sind erlaubt' },
        { status: 400 }
      );
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB
      return NextResponse.json(
        { error: 'Datei ist zu groß (max. 2MB)' },
        { status: 400 }
      );
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
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload fehlgeschlagen' },
      { status: 500 }
    );
  }
} 