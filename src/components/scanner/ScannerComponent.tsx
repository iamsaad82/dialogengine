import { useState } from 'react'
import { useScanner } from '@/hooks/useScanner'
import { WebsiteScanForm } from './WebsiteScanForm'
import { MarkdownScanForm } from './MarkdownScanForm'
import { ScanProgress } from './ScanProgress'
import { Alert } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ScannerComponentProps {
  templateId: string
}

export function ScannerComponent({ templateId }: ScannerComponentProps) {
  const [activeTab, setActiveTab] = useState<'website' | 'markdown'>('website')
  
  const {
    status,
    error,
    isScanning,
    scanWebsite,
    scanMarkdownDirectory,
    cancelScan
  } = useScanner({ templateId })

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Content Scanner</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            {error}
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'website' | 'markdown')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="website" disabled={isScanning}>Website</TabsTrigger>
            <TabsTrigger value="markdown" disabled={isScanning}>Markdown</TabsTrigger>
          </TabsList>

          <TabsContent value="website">
            <WebsiteScanForm
              onSubmit={scanWebsite}
              isScanning={isScanning}
              onCancel={cancelScan}
            />
          </TabsContent>

          <TabsContent value="markdown">
            <MarkdownScanForm
              onSubmit={scanMarkdownDirectory}
              isScanning={isScanning}
              onCancel={cancelScan}
            />
          </TabsContent>
        </Tabs>

        {status && (
          <div className="mt-6">
            <ScanProgress progress={status} />
          </div>
        )}
      </CardContent>
    </Card>
  )
} 