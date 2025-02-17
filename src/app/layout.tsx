import type { Metadata } from 'next'
import './globals.css'
import Providers from './providers'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Dialog Engine',
  description: 'A powerful chatbot engine',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning={true}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  )
}
