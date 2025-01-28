/**
 * Safely parse a JSON string or return the original value if already parsed
 */
export const parseJsonField = <T>(field: string | T): T => {
  if (typeof field === 'string') {
    try {
      return JSON.parse(field) as T;
    } catch (e) {
      console.error('Error parsing JSON field:', e);
      return {} as T;
    }
  }
  return field;
};

/**
 * Safely stringify a value or return empty JSON string if fails
 */
export const stringifyJsonField = <T>(field: T): string => {
  try {
    return JSON.stringify(field);
  } catch (e) {
    console.error('Error stringifying field:', e);
    return '{}';
  }
}; 