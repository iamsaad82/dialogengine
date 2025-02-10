import { useState, useEffect } from 'react'
import { ScanProgress } from '@/lib/types/scanner'

interface ScanOptions {
  scanSubpages?: boolean
  maxDepth?: number
  includePatterns?: string[]
  excludePatterns?: string[]
  recursive?: boolean
}

interface UseScannerProps {
  templateId: string
  pollingInterval?: number
}

export function useScanner({ templateId, pollingInterval = 2000 }: UseScannerProps) {
  const [status, setStatus] = useState<ScanProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  // Polling-Funktion für den Scan-Status
  useEffect(() => {
    let intervalId: NodeJS.Timeout

    const pollStatus = async () => {
      if (!isScanning || !templateId) return

      try {
        const response = await fetch(`/api/scan/website?templateId=${templateId}`)
        const data = await response.json()

        if (!data.success) {
          setError(data.message)
          setIsScanning(false)
          return
        }

        setStatus(data.status)

        if (data.status?.status === 'completed' || data.status?.status === 'error') {
          setIsScanning(false)
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Fehler beim Abrufen des Status')
        setIsScanning(false)
      }
    }

    if (isScanning) {
      intervalId = setInterval(pollStatus, pollingInterval)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [isScanning, templateId, pollingInterval])

  // Website-Scan starten
  const scanWebsite = async (url: string, options?: ScanOptions) => {
    try {
      setError(null)
      setIsScanning(true)

      const response = await fetch('/api/scan/website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          templateId,
          options
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Starten des Scans')
      setIsScanning(false)
    }
  }

  // Markdown-Verzeichnis scannen
  const scanMarkdownDirectory = async (directory: string, options?: ScanOptions) => {
    try {
      setError(null)
      setIsScanning(true)

      const response = await fetch('/api/scan/markdown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          directory,
          templateId,
          options
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Starten des Scans')
      setIsScanning(false)
    }
  }

  // Scan abbrechen
  const cancelScan = () => {
    setIsScanning(false)
  }

  return {
    status,
    error,
    isScanning,
    scanWebsite,
    scanMarkdownDirectory,
    cancelScan
  }
} 