import { ToastActionElement, type ToastProps as ShadcnToastProps } from "@/components/ui/toast"

export interface ToastProps extends ShadcnToastProps {
  variant?: 'default' | 'destructive'
}

export type ToasterToast = ToastProps & {
  id: string
  title?: string
  description?: string
  action?: ToastActionElement
}

export type Toast = ToasterToast

type ToasterToastOptions = Omit<ToasterToast, "id">

export function toast(options: ToasterToastOptions) {
  const { title, description, variant = "default", action } = options
  return {
    title,
    description,
    variant,
    action
  }
}

export function useToast() {
  return {
    toast,
    dismiss: (toastId?: string) => {}
  }
} 