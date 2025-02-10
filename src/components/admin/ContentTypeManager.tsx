'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Search, Filter, RefreshCcw, FileText, Tag } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { DocumentUploader } from '@/components/ui/upload'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ContentItem {
  id: string
  url: string
  title: string
  content: string
  type: string
  metadata: Record<string, any>
}

const contentTypes = [
  { value: 'info', label: 'Information', description: 'Allgemeine Informationen und Texte' },
  { value: 'service', label: 'Dienstleistung', description: 'Angebotene Services und Leistungen' },
  { value: 'product', label: 'Produkt', description: 'Produkte und deren Beschreibungen' },
  { value: 'event', label: 'Veranstaltung', description: 'Events, Termine und Veranstaltungen' },
  { value: 'location', label: 'Standort', description: 'Adressen und Ortsangaben' },
  { value: 'video', label: 'Video', description: 'Video-Inhalte und Multimedia' },
  { value: 'link', label: 'Link', description: 'Weiterführende Links und Verweise' },
  { value: 'contact', label: 'Kontakt', description: 'Kontaktinformationen' },
  { value: 'faq', label: 'FAQ', description: 'Häufig gestellte Fragen' },
  { value: 'download', label: 'Download', description: 'Downloadbare Ressourcen' }
]

interface ContentTypeManagerProps {
  templateId: string
}

export default function ContentTypeManager({ templateId }: ContentTypeManagerProps) {
  const [contents, setContents] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const { toast } = useToast()

  useEffect(() => {
    loadContents()
  }, [templateId])

  const loadContents = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/search/test?templateId=${templateId}`)
      if (!response.ok) throw new Error('Fehler beim Laden der Inhalte')
      
      const data = await response.json()
      const formattedContents = data.results
        .filter((item: any) => item.metadata?.templateId === templateId)
        .map((item: any) => ({
          id: Buffer.from(item.url).toString('base64'),
          url: item.url,
          title: item.title,
          content: item.text || '',
          type: item.metadata?.contentType || 'info',
          metadata: item.metadata || {}
        }))
      
      setContents(formattedContents)
    } catch (error) {
      console.error('Fehler beim Laden:', error)
      toast({
        title: 'Fehler',
        description: 'Inhalte konnten nicht geladen werden.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTypeChange = async (id: string, newType: string) => {
    try {
      // Aktualisiere den Typ in der UI
      setContents(prevContents => 
        prevContents.map(content => 
          content.id === id ? { ...content, type: newType } : content
        )
      )

      // Speichere die Änderung in der Datenbank
      const response = await fetch('/api/content/type', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          type: newType,
          templateId 
        })
      })

      if (!response.ok) throw new Error('Fehler beim Speichern')

      toast({
        title: 'Änderungen gespeichert',
        description: 'Die Inhaltstypen wurden erfolgreich aktualisiert.',
      })
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error)
      toast({
        title: 'Fehler',
        description: 'Änderungen konnten nicht gespeichert werden.',
      })
    }
  }

  const filteredContents = contents.filter(content => {
    const matchesSearch = 
      content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.content.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesType = selectedType === 'all' || content.type === selectedType
    
    return matchesSearch && matchesType
  })

  const contentTypeStats = contents.reduce((acc, content) => {
    acc[content.type] = (acc[content.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="contents">
        <TabsList>
          <TabsTrigger value="contents">Inhalte</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>
        
        <TabsContent value="contents" className="space-y-6">
          {/* Header mit Statistiken */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {contentTypes.map(type => (
              <Card key={type.value} className="relative overflow-hidden">
                <CardHeader className="space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {type.label}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {contentTypeStats[type.value] || 0} Einträge
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {((contentTypeStats[type.value] || 0) / contents.length * 100).toFixed(1)}%
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary">
                    <div 
                      className="h-full bg-primary"
                      style={{ 
                        width: `${(contentTypeStats[type.value] || 0) / contents.length * 100}%`
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Suchleiste und Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Typ filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                {contentTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={loadContents} variant="outline">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Aktualisieren
            </Button>
          </div>

          {/* Inhaltsliste */}
          <div className="grid gap-4">
            {filteredContents.map((content) => (
              <Card key={content.id} className="relative overflow-hidden">
                <div 
                  className="absolute top-0 left-0 w-1 h-full"
                  style={{
                    background: content.type === 'info' ? 'var(--info)' :
                              content.type === 'service' ? 'var(--service)' :
                              content.type === 'product' ? 'var(--product)' :
                              content.type === 'event' ? 'var(--event)' :
                              content.type === 'location' ? 'var(--location)' :
                              'var(--primary)'
                  }}
                />
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {content.title}
                      </CardTitle>
                      <CardDescription className="truncate mt-1">
                        {content.url}
                      </CardDescription>
                    </div>
                    <Select
                      value={content.type}
                      onValueChange={(value) => handleTypeChange(content.id, value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <Tag className="mr-2 h-4 w-4" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {contentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground line-clamp-3">
                      {content.content}
                    </div>
                    
                    {Object.entries(content.metadata).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(content.metadata).map(([key, value]) => (
                          key !== 'templateId' && key !== 'fileType' && (
                            <Badge key={key} variant="secondary" className="text-xs">
                              {key}: {String(value)}
                            </Badge>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredContents.length === 0 && (
              <div className="text-center p-8 text-muted-foreground">
                {searchQuery || selectedType !== 'all' ? (
                  'Keine Ergebnisse gefunden.'
                ) : (
                  'Keine Inhalte vorhanden. Fügen Sie neue Inhalte hinzu.'
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Neue Inhalte hochladen</CardTitle>
              <CardDescription>
                Laden Sie Dokumente hoch, die automatisch analysiert und kategorisiert werden.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentUploader 
                templateId={templateId} 
                onUploadComplete={loadContents}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 