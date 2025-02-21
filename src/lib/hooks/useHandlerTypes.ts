import { useQuery } from '@tanstack/react-query'
import { HandlerType } from '@/lib/types/handler'

export interface HandlerTypeResponse {
  types: HandlerType[]
}

export function useHandlerTypes() {
  return useQuery<HandlerTypeResponse>({
    queryKey: ['handlerTypes'],
    queryFn: async () => {
      const response = await fetch('/api/handlers/types')
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Handler-Typen')
      }
      return response.json()
    },
    staleTime: 1000 * 60 * 5, // 5 Minuten Cache
    gcTime: 1000 * 60 * 30 // 30 Minuten Cache
  })
} 