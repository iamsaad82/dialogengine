import { useQuery } from '@tanstack/react-query'

interface HandlerType {
  id: string
  label: string
  description?: string
  metadata?: {
    icon?: string
    category?: string
    capabilities?: string[]
  }
}

export function useHandlerTypes() {
  const { data: types, isLoading, error } = useQuery<HandlerType[]>({
    queryKey: ['handlerTypes'],
    queryFn: async () => {
      const response = await fetch('/api/handlers/types')
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Handler-Typen')
      }
      return response.json()
    }
  })

  return {
    types,
    isLoading,
    error
  }
} 