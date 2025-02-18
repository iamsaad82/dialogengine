# Upload-System Dokumentation

## Überblick

Das Upload-System der DialogEngine ermöglicht das sichere Hochladen und Verarbeiten von Dokumenten und Bildern. Es ist darauf ausgelegt, verschiedene Dateitypen zu unterstützen und dabei maximale Sicherheit zu gewährleisten.

## Unterstützte Dateitypen

### Dokumente
- PDF (application/pdf)
- Microsoft Word (.docx, application/vnd.openxmlformats-officedocument.wordprocessingml.document)
- Text/Markdown (.txt, .md, text/plain, text/markdown)

### Bilder
- JPEG/JPG (image/jpeg)
- PNG (image/png)
- WebP (image/webp)

## API-Endpunkte

### 1. Basis-Upload `/api/upload`
- **Methode**: POST
- **Funktion**: Allgemeiner Datei-Upload
- **Validierung**: MIME-Type, Dateigröße
- **Response**: Upload-URL

### 2. Dokument-Upload `/api/upload/document`
- **Methode**: POST
- **Funktion**: Spezifisch für Dokumente
- **Zusätzliche Verarbeitung**: Extraktion, Vektorisierung
- **Response**: Dokument-ID, Status

### 3. Dokument-Status `/api/upload/document/[id]`
- **Methode**: GET
- **Funktion**: Status-Abfrage
- **Response**: Verarbeitungsstatus, Metadaten

### 4. Vektorisierung `/api/upload/vectorize`
- **Methode**: POST
- **Funktion**: Nachträgliche Vektorisierung
- **Response**: Vektorisierungsstatus

## Sicherheitsmaßnahmen

### 1. Dateivalidierung
```typescript
const validateFile = (file: File): ValidationResult => {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  return {
    isValid: validTypes.includes(file.type) && file.size <= maxSize,
    errors: []
  };
};
```

### 2. Speicherung
- Sichere Dateipfade
- Randomisierte Dateinamen
- Zugriffsrechte-Prüfung

### 3. Verarbeitungspipeline
1. Validierung
2. Virus-Scan (optional)
3. Metadaten-Extraktion
4. Speicherung
5. Vektorisierung

## Fehlerbehandlung

### 1. Upload-Fehler
```typescript
type UploadError = {
  code: string;
  message: string;
  details?: any;
};

const handleUploadError = (error: UploadError) => {
  logger.error('Upload failed', { error });
  return new Response(JSON.stringify({ error }), { status: 400 });
};
```

### 2. Validierungsfehler
- MIME-Type nicht unterstützt
- Dateigröße überschritten
- Datei beschädigt

### 3. Verarbeitungsfehler
- Extraktionsfehler
- Vektorisierungsfehler
- Speicherfehler

## Konfiguration

### 1. Umgebungsvariablen
```env
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/webp,application/pdf
UPLOAD_STORAGE_PATH=/uploads
UPLOAD_TEMP_DIR=/tmp/uploads
```

### 2. Storage-Konfiguration
- Lokaler Speicher
- S3-kompatible Speicher
- Zugriffsrechte

## Monitoring & Logging

### 1. Upload-Metriken
- Erfolgsrate
- Durchschnittliche Dateigröße
- Verarbeitungszeit

### 2. Error-Tracking
- Upload-Fehler
- Validierungsfehler
- Systemfehler

### 3. Audit-Logging
```typescript
const logUpload = (file: File, user: User) => {
  logger.info('File upload', {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    userId: user.id,
    timestamp: new Date()
  });
};
```

## Best Practices

### 1. Implementierung
- Chunked Upload für große Dateien
- Progress-Tracking
- Retry-Mechanismen

### 2. Sicherheit
- Strict Content-Type-Checking
- Dateigrößenlimits
- Zugriffskontrollen

### 3. Performance
- Optimierte Speichernutzung
- Effiziente Verarbeitung
- Caching wo sinnvoll 