/**
 * Safely parse a JSON string or return the original value if already parsed
 */
export const parseJsonField = (field) => {
    if (typeof field === 'string') {
        try {
            return JSON.parse(field);
        }
        catch (e) {
            console.error('Error parsing JSON field:', e);
            return {};
        }
    }
    return field;
};
/**
 * Safely stringify a value or return empty JSON string if fails
 */
export const stringifyJsonField = (field) => {
    try {
        return JSON.stringify(field);
    }
    catch (e) {
        console.error('Error stringifying field:', e);
        return '{}';
    }
};
