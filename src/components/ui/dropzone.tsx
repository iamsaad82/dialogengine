import { useDropzone } from 'react-dropzone'
import { cn } from '@/lib/utils'

interface DropzoneProps {
  onDrop: (files: File[]) => void
  children?: React.ReactNode
  className?: string
}

export function Dropzone({ onDrop, children, className }: DropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/markdown': ['.md'],
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/xml': ['.xml']
    }
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        'cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors',
        isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/20 hover:border-primary',
        className
      )}
    >
      <input {...getInputProps()} />
      {children}
    </div>
  )
}