"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cn = cn;
exports.chunk = chunk;
const clsx_1 = require("clsx");
const tailwind_merge_1 = require("tailwind-merge");
function cn(...inputs) {
    return (0, tailwind_merge_1.twMerge)((0, clsx_1.clsx)(inputs));
}
/**
 * Teilt einen Text oder Array in kleinere Chunks auf
 */
function chunk(input, size) {
    if (typeof input === 'string') {
        // Text in Sätze aufteilen
        const sentences = input.match(/[^.!?]+[.!?]+/g) || [input];
        // Chunks erstellen
        const chunks = [];
        let currentChunk = '';
        for (const sentence of sentences) {
            if ((currentChunk + sentence).length <= size) {
                currentChunk += sentence;
            }
            else {
                if (currentChunk)
                    chunks.push(currentChunk.trim());
                currentChunk = sentence;
            }
        }
        if (currentChunk)
            chunks.push(currentChunk.trim());
        return chunks;
    }
    // Array in Chunks aufteilen
    return Array.from({ length: Math.ceil(input.length / size) }, (_, i) => input.slice(i * size, (i + 1) * size));
}
