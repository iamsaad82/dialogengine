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
  FormMessage
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
  url: z.string().url('Bitte geben Sie eine gültige URL ein'),
  options: z.object({
    scanSubpages: z.boolean().default(false),
    maxDepth: z.number().min(1).max(10).optional(),
    includePatterns: z.string().optional(),
    excludePatterns: z.string().optional()
  })
})

type FormValues = z.infer<typeof formSchema>

interface WebsiteScanFormProps {
  onSubmit: (url: string, options?: any) => Promise<void>
  isScanning: boolean
  onCancel: () => void
}

export function WebsiteScanForm({ onSubmit, isScanning, onCancel }: WebsiteScanFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: '',
      options: {
        scanSubpages: false,
        maxDepth: 3,
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

    await onSubmit(values.url, options)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://example.com"
                  {...field}
                  disabled={isScanning}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Accordion type="single" collapsible>
          <AccordionItem value="advanced">
            <AccordionTrigger>Erweiterte Optionen</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="options.scanSubpages"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Unterseiten scannen</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isScanning}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch('options.scanSubpages') && (
                  <FormField
                    control={form.control}
                    name="options.maxDepth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximale Tiefe</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value))}
                            disabled={isScanning}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="options.includePatterns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Einschließen (durch Komma getrennt)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="*.html, /docs/*"
                          {...field}
                          disabled={isScanning}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="options.excludePatterns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ausschließen (durch Komma getrennt)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="*.pdf, /admin/*"
                          {...field}
                          disabled={isScanning}
                        />
                      </FormControl>
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
            <Button type="button" variant="destructive" onClick={onCancel}>
              Abbrechen
            </Button>
          ) : (
            <Button type="submit">
              Scan starten
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
} 