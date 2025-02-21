'use client'

import React from 'react'
import { useEffect, useState } from 'react'
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
  status: 'idle' | 'indexing' | 'error'
  error?: string
}

interface VectorManagerProps {
  templateId: string
  contentTypes: ContentTypeResult[]
  onVectorUpdate?: () => void
}

export const VectorManager: React.FC<VectorManagerProps> = ({
  templateId,
  contentTypes,
  onVectorUpdate
}) => {
  const [stats, setStats] = useState<VectorStats>({
    totalVectors: 0,
    vectorsByType: {},
    averageScore: 0,
    lastUpdate: '',
    status: 'idle'
  })

  useEffect(() => {
    fetchVectorStats()
  }, [templateId])

  const fetchVectorStats = async () => {
    try {
      const response = await fetch(`/api/templates/${templateId}/vectors/stats`)
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Fehler beim Laden der Vector-Statistiken:', error)
    }
  }

  const handleReindex = async () => {
    try {
      setStats(prev => ({ ...prev, status: 'indexing' }))
      
      const response = await fetch(`/api/templates/${templateId}/vectors/reindex`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Reindexierung fehlgeschlagen')
      }

      await fetchVectorStats()
      onVectorUpdate?.()
    } catch (error) {
      console.error('Fehler bei der Reindexierung:', error)
      setStats(prev => ({ ...prev, status: 'error' }))
    }
  }

  if (stats.status === 'error') {
    return (
      <div className="text-center p-4 text-red-500">
        Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Vector Management</h3>
        <Button
          variant="outline"
          onClick={handleReindex}
          disabled={stats.status === 'indexing'}
        >
          {stats.status === 'indexing' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Indexierung läuft...
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
              {stats.status === 'idle' ? (
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