import React, { useEffect, useState } from 'react'
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { Button } from "@/components/ui/button"

interface AnalyticsEditorProps {
  templateId: string
}

interface Analytics {
  totalQuestions: number
  answeredQuestions: number
  recentQuestions: Array<{
    id: string
    timestamp: string
    question: string
    answer?: string
    wasAnswered: boolean
    sessionId: string
  }>
  unansweredQuestions: Array<{
    question: string
    _count: {
      question: number
    }
  }>
}

export function AnalyticsEditor({ templateId }: AnalyticsEditorProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (id: string) => {
    const newExpandedRows = new Set(expandedRows)
    if (expandedRows.has(id)) {
      newExpandedRows.delete(id)
    } else {
      newExpandedRows.add(id)
    }
    setExpandedRows(newExpandedRows)
  }

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/analytics/${templateId}`)
      if (!response.ok) throw new Error('Fehler beim Laden der Analytics')
      const data = await response.json()
      setAnalytics(data)
    } catch (err) {
      setError('Fehler beim Laden der Analytics')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
    
    // Setze einen Intervall für automatische Aktualisierung alle 10 Sekunden
    const interval = setInterval(fetchAnalytics, 10000)
    
    // Cleanup beim Unmount der Komponente
    return () => clearInterval(interval)
  }, [templateId])

  if (loading) return <div>Laden...</div>
  if (error) return <div className="text-red-500">{error}</div>
  if (!analytics) return <div>Keine Daten verfügbar</div>

  const successRate = Math.round((analytics.answeredQuestions / analytics.totalQuestions) * 100) || 0

  return (
    <div className="space-y-6">
      {/* Übersichtskarten */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Gesamtfragen</h3>
          <p className="mt-2 text-3xl font-bold">{analytics.totalQuestions}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Beantwortet</h3>
          <p className="mt-2 text-3xl font-bold">{analytics.answeredQuestions}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Erfolgsquote</h3>
          <p className="mt-2 text-3xl font-bold">{successRate}%</p>
        </Card>
      </div>

      {/* Letzte Fragen */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold tracking-tight">Letzte Fragen</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zeitpunkt</TableHead>
              <TableHead>Frage & Antwort</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Session</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analytics.recentQuestions.map((log) => (
              <React.Fragment key={log.id}>
                <TableRow>
                  <TableCell className="font-mono">
                    {format(new Date(log.timestamp), 'dd.MM.yy HH:mm', { locale: de })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{log.question}</span>
                      {log.answer && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            toggleRow(log.id)
                          }}
                        >
                          {expandedRows.has(log.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {log.wasAnswered ? (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Beantwortet
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Nicht beantwortet
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono">{log.sessionId}</TableCell>
                </TableRow>
                {expandedRows.has(log.id) && log.answer && (
                  <TableRow>
                    <TableCell colSpan={4} className="bg-muted/50">
                      <div className="p-4">
                        <h4 className="font-medium mb-2">Antwort:</h4>
                        <p className="whitespace-pre-wrap">{log.answer}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Häufigste unbeantwortete Fragen */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold tracking-tight">Häufigste unbeantwortete Fragen</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Frage</TableHead>
              <TableHead>Anzahl</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analytics.unansweredQuestions.map((item) => (
              <TableRow key={item.question}>
                <TableCell>{item.question}</TableCell>
                <TableCell>{item._count.question}x</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
} 