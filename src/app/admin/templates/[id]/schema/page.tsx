import { SchemaManager } from '@/components/admin/template/schema/SchemaManager'

interface PageProps {
  params: {
    id: string
  }
}

export default function Page({ params }: PageProps) {
  return <SchemaManager templateId={params.id} />
} 