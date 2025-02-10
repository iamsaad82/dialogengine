import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'

const formSchema = z.object({
  directory: z.string().min(1, 'Bitte geben Sie ein Verzeichnis an'),
  options: z.object({
    recursive: z.boolean().default(false),
    includePatterns: z.string().optional(),
    excludePatterns: z.string().optional()
  })
})

type FormValues = z.infer<typeof formSchema>

interface MarkdownScanFormProps {
  onSubmit: (directory: string, options?: any) => Promise<void>
  isScanning: boolean
  onCancel: () => void
}

export function MarkdownScanForm({ onSubmit, isScanning, onCancel }: MarkdownScanFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      directory: '',
      options: {
        recursive: false,
        includePatterns: '',
        excludePatterns: ''
      }
    }
  })

  const handleSubmit = async (values: FormValues) => {
    const options = {
      ...values.options,
      includePatterns: values.options.includePatterns
        ? values.options.includePatterns.split(',').map(p => p.trim())
        : undefined,
      excludePatterns: values.options.excludePatterns
        ? values.options.excludePatterns.split(',').map(p => p.trim())
        : undefined
    }

    await onSubmit(values.directory, options)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="directory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Verzeichnis</FormLabel>
              <FormControl>
                <Input placeholder="/pfad/zu/markdown/dateien" {...field} />
              </FormControl>
              <FormDescription>
                Geben Sie den Pfad zum Verzeichnis mit den Markdown-Dateien an
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Accordion type="single" collapsible>
          <AccordionItem value="advanced">
            <AccordionTrigger onClick={() => setShowAdvanced(!showAdvanced)}>
              Erweiterte Optionen
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="options.recursive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Rekursiv scannen</FormLabel>
                        <FormDescription>
                          Auch Unterverzeichnisse durchsuchen
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="options.includePatterns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Einschließen (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="*.md,README*"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Kommagetrennte Liste von Glob-Patterns
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="options.excludePatterns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ausschließen (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="node_modules/**,*.test.md"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Kommagetrennte Liste von Glob-Patterns
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex justify-end space-x-2">
          {isScanning ? (
            <Button
              type="button"
              variant="destructive"
              onClick={onCancel}
            >
              Abbrechen
            </Button>
          ) : (
            <Button type="submit">
              Scannen starten
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
} 