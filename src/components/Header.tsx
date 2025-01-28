import Image from 'next/image'
import Link from 'next/link'
import { Settings } from 'lucide-react'

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center">
            <Image
              src="/sawmue_logo.png"
              alt="SawatzkiMühlenbruch Logo"
              width={120}
              height={40}
              className="header-logo"
              priority
            />
          </Link>

          <Link 
            href="/admin" 
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Konfiguration</span>
          </Link>
        </div>
      </div>
    </header>
  )
} 