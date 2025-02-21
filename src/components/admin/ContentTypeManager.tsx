import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { ContentTypeDefinition } from '@/lib/types/contentTypes'
import { toast } from 'sonner'

interface ContentTypeManagerProps {
  onUpdate?: () => void
}

export default function ContentTypeManager({ onUpdate }: ContentTypeManagerProps) {
  const [contentTypes, setContentTypes] = useState<ContentTypeDefinition[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<ContentTypeDefinition | null>(null)
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    validation: ''
  })

  useEffect(() => {
    loadContentTypes()
  }, [])

  const loadContentTypes = async () => {
    try {
      const response = await fetch('/api/content-types')
      if (!response.ok) throw new Error('Fehler beim Laden der Content-Typen')
      const data = await response.json()
      setContentTypes(data)
    } catch (error) {
      toast.error('Content-Typen konnten nicht geladen werden')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/content-types', {
        method: selectedType ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          id: selectedType?.id || formData.id
        })
      })

      if (!response.ok) throw new Error('Fehler beim Speichern')

      toast.success(
        selectedType
          ? 'Content-Typ erfolgreich aktualisiert'
          : 'Content-Typ erfolgreich erstellt'
      )
      
      setIsAddDialogOpen(false)
      setIsEditDialogOpen(false)
      loadContentTypes()
      onUpdate?.()
    } catch (error) {
      toast.error('Fehler beim Speichern des Content-Typs')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Möchten Sie diesen Content-Typ wirklich löschen?')) return

    try {
      const response = await fetch(`/api/content-types/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Fehler beim Löschen')

      toast.success('Content-Typ erfolgreich gelöscht')
      loadContentTypes()
      onUpdate?.()
    } catch (error) {
      toast.error('Fehler beim Löschen des Content-Typs')
    }
  }

  const openEditDialog = (type: ContentTypeDefinition) => {
    setSelectedType(type)
    setFormData({
      id: type.id,
      name: type.name,
      description: type.description || '',
      validation: JSON.stringify(type.validation || {}, null, 2)
    })
    setIsEditDialogOpen(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content-Typen</CardTitle>
        <CardDescription>
          Verwalten Sie die verschiedenen Content-Typen für Ihre Templates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Neuer Content-Typ
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Content-Typ erstellen</DialogTitle>
                <DialogDescription>
                  Erstellen Sie einen neuen Content-Typ für Ihre Templates
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="id" className="text-right">
                      ID
                    </Label>
                    <Input
                      id="id"
                      value={formData.id}
                      onChange={(e) =>
                        setFormData({ ...formData, id: e.target.value })
                      }
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Beschreibung
                    </Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="validation" className="text-right">
                      Validierungsregeln
                    </Label>
                    <Input
                      id="validation"
                      value={formData.validation}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          validation: e.target.value
                        })
                      }
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Speichern</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Beschreibung</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contentTypes.map((type) => (
              <TableRow key={type.id}>
                <TableCell>{type.id}</TableCell>
                <TableCell>{type.name}</TableCell>
                <TableCell>{type.description}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(type)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(type.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Content-Typ bearbeiten</DialogTitle>
              <DialogDescription>
                Bearbeiten Sie die Details des Content-Typs
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-description" className="text-right">
                    Beschreibung
                  </Label>
                  <Input
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-validation" className="text-right">
                    Validierungsregeln
                  </Label>
                  <Input
                    id="edit-validation"
                    value={formData.validation}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        validation: e.target.value
                      })
                    }
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Aktualisieren</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
} 