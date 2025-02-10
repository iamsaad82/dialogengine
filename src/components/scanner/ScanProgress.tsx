import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { ScanProgress as ScanProgressType } from '@/lib/services/scanner/types'

interface ScanProgressProps {
  progress: ScanProgressType
}

export function ScanProgress({ progress }: ScanProgressProps) {
  const getStatusText = () => {
    switch (progress.status) {
      case 'pending':
        return 'Scan wird vorbereitet...'
      case 'scanning':
        return 'Scan läuft...'
      case 'vectorizing':
        return 'Inhalte werden vektorisiert...'
      case 'completed':
        return 'Scan abgeschlossen'
      case 'error':
        return 'Fehler beim Scannen'
      default:
        return 'Unbekannter Status'
    }
  }

  const getStatusVariant = () => {
    switch (progress.status) {
      case 'completed':
        return 'success'
      case 'error':
        return 'destructive'
      default:
        return 'default'
    }
  }

  const calculateProgress = () => {
    if (progress.status === 'completed') return 100
    if (progress.status === 'error') return 0
    
    if (progress.total === 0) return 0
    return Math.round((progress.current / progress.total) * 100)
  }

  return (
    <Alert variant={getStatusVariant()}>
      <AlertTitle>{getStatusText()}</AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-2">
          <Progress value={calculateProgress()} />
          {progress.status === 'scanning' && (
            <p className="text-sm text-muted-foreground">
              {progress.current} von {progress.total} Seiten gescannt
            </p>
          )}
          {progress.status === 'vectorizing' && (
            <p className="text-sm text-muted-foreground">
              {progress.current} von {progress.total} Inhalten vektorisiert
            </p>
          )}
          {progress.status === 'error' && progress.error && (
            <p className="text-sm text-destructive">
              {progress.error}
            </p>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
} 