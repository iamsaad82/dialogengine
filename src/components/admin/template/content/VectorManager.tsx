'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2, RefreshCw, Search, AlertCircle } from "lucide-react"
import type { ContentTypeResult } from '@/lib/types/template'

interface VectorStats {
  totalVectors: number
  vectorsByType: Record<string, number>
  averageScore: number
  lastUpdate: string
  status: 'ready' | 'indexing' | 'error'
  error?: string
}

interface VectorManagerProps {
  templateId: string
  contentTypes: ContentTypeResult[]
}

export function VectorManager({ templateId, contentTypes }: VectorManagerProps) {
  const [stats, setStats] = useState<VectorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [indexing, setIndexing] = useState(false)

  useEffect(() => {
    loadStats()
  }, [templateId])

  const loadStats = async () => {
    try {
      const response = await fetch(`/api/templates/${templateId}/vectors/stats`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Laden der Statistiken')
      }

      setStats(data)
    } catch (error) {
      console.error('Fehler beim Laden der Vector-Statistiken:', error)
    }
    setLoading(false)
  }

  const startIndexing = async () => {
    setIndexing(true)
    try {
      const response = await fetch(`/api/templates/${templateId}/vectors/reindex`, {
        method: 'POST'
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Reindexieren')
      }

      // Starte Polling für den Status
      pollIndexingStatus()
    } catch (error) {
      console.error('Fehler beim Starten der Vektorisierung:', error)
      setIndexing(false)
    }
  }

  const pollIndexingStatus = async () => {
    try {
      const response = await fetch(`/api/templates/${templateId}/vectors/status`)
      const data = await response.json()

      setStats(prev => ({ ...prev, ...data }))

      if (data.status === 'indexing') {
        setTimeout(pollIndexingStatus, 1000)
      } else {
        setIndexing(false)
      }
    } catch (error) {
      console.error('Fehler beim Status-Check:', error)
      setIndexing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        Keine Vector-Statistiken verfügbar
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-medium">Vector Store Status</h3>
          <p className="text-sm text-muted-foreground">
            Letzte Aktualisierung: {new Date(stats.lastUpdate).toLocaleString()}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={startIndexing}
          disabled={indexing || stats.status === 'indexing'}
        >
          {indexing || stats.status === 'indexing' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Wird indexiert...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Neu indexieren
            </>
          )}
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Gesamt Vektoren</p>
            <p className="text-2xl font-bold">{stats.totalVectors}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Durchschnittlicher Score</p>
            <p className="text-2xl font-bold">{(stats.averageScore * 100).toFixed(1)}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Status</p>
            <div>
              {stats.status === 'ready' ? (
                <Badge className="bg-green-500">
                  Bereit
                </Badge>
              ) : stats.status === 'indexing' ? (
                <Badge className="bg-blue-500">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Indexierung
                </Badge>
              ) : (
                <Badge className="bg-red-500">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Fehler
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-medium mb-2">Vektoren nach Typ</h4>
          <div className="space-y-2">
            {contentTypes.map((type) => {
              const count = stats.vectorsByType[type.type] || 0
              const percentage = stats.totalVectors > 0
                ? (count / stats.totalVectors) * 100
                : 0

              return (
                <div key={type.type} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{type.metadata.title || type.type}</span>
                    <span>{count}</span>
                  </div>
                  <Progress value={percentage} />
                </div>
              )
            })}
          </div>
        </div>

        {stats.error && (
          <div className="mt-4 p-3 bg-red-500/10 rounded-lg">
            <div className="flex items-center text-red-500">
              <AlertCircle className="h-4 w-4 mr-2" />
              <p className="text-sm font-medium">Fehler</p>
            </div>
            <p className="text-sm mt-1 text-red-500/80">{stats.error}</p>
          </div>
        )}
      </Card>
    </div>
  )
} 