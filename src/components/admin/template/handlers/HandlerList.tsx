'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import type { HandlerConfig } from '@/lib/types/template'

interface HandlerListProps {
  handlers: HandlerConfig[]
  onEdit: (handler: HandlerConfig) => void
  onDelete: (handler: HandlerConfig) => void
}

export function HandlerList({ handlers, onEdit, onDelete }: HandlerListProps) {
  const [deleteHandler, setDeleteHandler] = useState<HandlerConfig | null>(null)
  const { toast } = useToast()

  const handleDelete = async () => {
    if (!deleteHandler) return

    try {
      const response = await fetch(`/api/handlers/${deleteHandler.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Fehler beim Löschen des Handlers')
      }

      onDelete(deleteHandler)
      toast({
        title: 'Erfolg',
        description: 'Der Handler wurde erfolgreich gelöscht.'
      })
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
      toast({
        title: 'Fehler',
        description: 'Der Handler konnte nicht gelöscht werden.',
        variant: 'destructive'
      })
    }

    setDeleteHandler(null)
  }

  if (!handlers.length) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        Keine Handler vorhanden
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {handlers.map((handler) => (
        <Card key={handler.id} className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium">{handler.name}</h3>
              <p className="text-sm text-muted-foreground">{handler.type}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {(handler.capabilities || []).map((cap) => (
                  <Badge key={cap} variant="secondary">
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(handler)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteHandler(handler)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}

      <AlertDialog open={!!deleteHandler} onOpenChange={() => setDeleteHandler(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Handler löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den Handler "{deleteHandler?.name}" wirklich löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 