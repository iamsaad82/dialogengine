"use client"

import React from 'react'
import { Search, ArrowRight, ChevronRight } from "lucide-react"

interface ComplexModeProps {
  setIsDialogMode: (value: boolean) => void
}

export default function ComplexMode({ setIsDialogMode }: ComplexModeProps) {
  return (
    <div className="h-full bg-white/80 backdrop-blur-md rounded-lg shadow-xl flex flex-col">
      {/* Kompakte Suche */}
      <div className="p-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg transition-all duration-300 hover:bg-slate-100">
          <Search className="h-4 w-4 flex-shrink-0" />
          <span className="opacity-50">content management shopping center...</span>
          <span className="text-xs bg-slate-200 rounded px-1 ml-auto whitespace-nowrap">426 Ergebnisse</span>
        </div>
      </div>

      {/* Navigationspfade */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        <div className="flex items-center text-sm text-slate-600 bg-white rounded-lg border border-slate-100 p-2 transition-all duration-300 hover:border-indigo-200 hover:shadow-sm">
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Leistungen / Content Management</span>
          <span className="text-xs bg-slate-100 rounded px-1 ml-1 flex-shrink-0">12</span>
        </div>

        <div className="flex items-center text-sm text-slate-600 bg-white rounded-lg border border-slate-100 p-2 transition-all duration-300 hover:border-indigo-200 hover:shadow-sm">
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Retail Software / MallCockpit</span>
          <span className="text-xs bg-slate-100 rounded px-1 ml-1 flex-shrink-0">18</span>
        </div>

        <div className="flex items-center text-sm text-slate-600 bg-white rounded-lg border border-slate-100 p-2 transition-all duration-300 hover:border-indigo-200 hover:shadow-sm">
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Customer Journey / Digital Signage</span>
          <span className="text-xs bg-slate-100 rounded px-1 ml-1 flex-shrink-0">25</span>
        </div>

        {/* Hauptergebnis */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 transition-all duration-300 hover:border-indigo-200 hover:shadow-sm">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1 min-w-0">
              <h3 className="font-medium text-slate-700 truncate">Digitales Marketing für Shopping Center</h3>
              <p className="text-sm text-slate-500 line-clamp-2">
                Kennen Sie das auch? Auf Ihrer Webseite ist noch Weihnachten, Ihr letzter Facebook-Post ist drei Monate alt...
              </p>
            </div>
            <span className="text-xs text-slate-400 whitespace-nowrap">4 Min.</span>
          </div>
        </div>
      </div>

      {/* Hinweis - Fixed Bottom */}
      <div className="p-3 border-t border-slate-100">
        <div className="bg-indigo-50/80 backdrop-blur-sm rounded-xl border border-indigo-100 p-4 space-y-3">
          <p className="text-indigo-600 font-medium text-center">
            Oder fragen Sie einfach: &ldquo;Wie funktioniert Ihr Content Management?&rdquo;
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => setIsDialogMode(true)}
              className="inline-flex items-center gap-2 text-indigo-600 bg-white/80 px-4 py-2 rounded-lg border border-indigo-100 hover:bg-white hover:shadow-sm transition-all group"
            >
              <span className="text-sm">In den Dialog-Modus wechseln</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 