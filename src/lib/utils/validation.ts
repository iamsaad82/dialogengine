/**
 * Validates if a URL is valid
 */
export function validateUrl(url: string): boolean {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if a value is not empty
 */
export function validateRequired(value: string): boolean {
  return value !== undefined && value !== null && value.trim() !== '';
}

/**
 * Gets a localized error message for a field
 */
export function getErrorMessage(field: string, type: 'required' | 'url'): string {
  switch (type) {
    case 'required':
      return `${field} ist erforderlich`;
    case 'url':
      return `${field} muss eine gültige URL sein`;
    default:
      return 'Ungültige Eingabe';
  }
} 