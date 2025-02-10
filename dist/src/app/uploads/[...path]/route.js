import { NextResponse } from 'next/server';
import { join } from 'path';
import { readFileSync } from 'fs';
import { existsSync } from 'fs';
export async function GET(request, { params }) {
    try {
        const filePath = join(process.cwd(), 'public', 'uploads', ...params.path);
        if (!existsSync(filePath)) {
            return new NextResponse('File not found', { status: 404 });
        }
        const file = readFileSync(filePath);
        const contentType = getContentType(filePath);
        return new NextResponse(file, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    }
    catch (error) {
        console.error('Error serving file:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
function getContentType(filePath) {
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        return 'image/jpeg';
    }
    if (filePath.endsWith('.png')) {
        return 'image/png';
    }
    if (filePath.endsWith('.webp')) {
        return 'image/webp';
    }
    return 'application/octet-stream';
}
