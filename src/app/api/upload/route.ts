import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export async function POST(request: Request) {
  try {
    console.log('Starting file upload process...');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.log('No file found in request');
      return NextResponse.json(
        { error: 'Keine Datei gefunden' },
        { status: 400 }
      );
    }

    // Log file details
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });

    // Validierung des MIME-Types und der Dateiendung
    const fileType = file.type.toLowerCase();
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    const isValidMimeType = ALLOWED_IMAGE_TYPES.includes(fileType);
    const isValidExtension = ALLOWED_EXTENSIONS.includes(extension);
    
    console.log('Validation results:', {
      fileType,
      extension,
      isValidMimeType,
      isValidExtension,
      allowedTypes: ALLOWED_IMAGE_TYPES,
      allowedExtensions: ALLOWED_EXTENSIONS
    });
    
    if (!isValidMimeType && !isValidExtension) {
      console.log('File type validation failed');
      return NextResponse.json(
        { error: 'Nur Bilder im Format JPG, JPEG, PNG oder WebP sind erlaubt' },
        { status: 400 }
      );
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB
      console.log('File size validation failed');
      return NextResponse.json(
        { error: 'Datei ist zu groß (max. 2MB)' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    console.log('Uploads directory path:', uploadsDir);
    console.log('Directory exists:', existsSync(uploadsDir));

    if (!existsSync(uploadsDir)) {
      console.log('Creating uploads directory...');
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const uniqueId = Math.random().toString(36).substring(2, 15);
    const originalName = file.name.toLowerCase().replace(/[^a-z0-9.]/g, '-');
    const filename = `${uniqueId}-${originalName}`;
    const filepath = join(uploadsDir, filename);
    
    console.log('File will be saved as:', {
      filename,
      fullPath: filepath
    });

    // Write file
    await writeFile(filepath, buffer);
    console.log('File successfully written to disk');

    // Return the URL that can be used to access the file
    const responseUrl = `/uploads/${filename}`;
    console.log('Returning URL:', responseUrl);
    
    return NextResponse.json({ url: responseUrl });
  } catch (error) {
    console.error('Upload error details:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error
    });
    
    return NextResponse.json(
      { error: 'Upload fehlgeschlagen' },
      { status: 500 }
    );
  }
} 