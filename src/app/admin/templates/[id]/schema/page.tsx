'use client'

import { SchemaEditor } from "@/components/admin/template/SchemaEditor"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"

interface PageProps {
  params: {
    id: string
  }
}

export default function Page({ params }: PageProps) {
  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Inhaltstypen definieren</h1>
        <p className="text-muted-foreground mb-4">
          Legen Sie fest, welche Informationen aus Ihrer Website extrahiert werden sollen.
        </p>
        
        <Alert className="mb-6">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Das Schema bestimmt, wie die Dialog Engine Ihre Inhalte versteht und verarbeitet. 
            Je präziser die Definition, desto besser die Antworten im Chat.
          </AlertDescription>
        </Alert>
      </div>
      
      <SchemaEditor templateId={params.id} />
    </div>
  )
} 