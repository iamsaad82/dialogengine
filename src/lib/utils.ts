import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Teilt einen Text oder Array in kleinere Chunks auf
 */
export function chunk<T>(input: string | T[], size: number): T[] {
  if (typeof input === 'string') {
    // Text in Sätze aufteilen
    const sentences = input.match(/[^.!?]+[.!?]+/g) || [input]
    
    // Chunks erstellen
    const chunks: string[] = []
    let currentChunk = ''
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= size) {
        currentChunk += sentence
      } else {
        if (currentChunk) chunks.push(currentChunk.trim())
        currentChunk = sentence
      }
    }
    
    if (currentChunk) chunks.push(currentChunk.trim())
    return chunks as T[]
  }
  
  // Array in Chunks aufteilen
  return Array.from(
    { length: Math.ceil(input.length / size) },
    (_, i) => input.slice(i * size, (i + 1) * size)
  ) as T[]
}
