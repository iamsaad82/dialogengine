'use client'

import { LayoutIcon, Bot, Paintbrush, Settings, BarChart, ListTree, FileJson, Rows } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface LayoutProps {
  children: React.ReactNode
  params: {
    id: string
  }
}

export default function Layout({ children, params }: LayoutProps) {
  const pathname = usePathname()

  const tabs = [
    {
      title: "Einstellungen",
      href: `/admin/templates/${params.id}/settings`,
      icon: Settings
    },
    {
      title: "Inhalte",
      href: `/admin/templates/${params.id}/content`,
      icon: LayoutIcon
    },
    {
      title: "Dokumente-Upload",
      href: `/admin/templates/${params.id}/document-types`,
      icon: FileJson
    },
    {
      title: "Layouts",
      href: `/admin/templates/${params.id}/layouts`,
      icon: Rows
    },
    {
      title: "Schema",
      href: `/admin/templates/${params.id}/schema`,
      icon: ListTree
    },
    {
      title: "Handler",
      href: `/admin/templates/${params.id}/handlers`,
      icon: Bot
    },
    {
      title: "Bot",
      href: `/admin/templates/${params.id}/bot`,
      icon: Bot
    },
    {
      title: "Branding",
      href: `/admin/templates/${params.id}/branding`,
      icon: Paintbrush
    },
    {
      title: "Analytics",
      href: `/admin/templates/${params.id}/analytics`,
      icon: BarChart
    }
  ]

  const currentTab = pathname.split('/').pop()

  return (
    <div className="space-y-6">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <Link
            href="/admin/templates"
            className="mr-6 text-sm font-medium text-muted-foreground hover:text-primary"
          >
            ← Zurück zur Übersicht
          </Link>
          <div className="flex items-center space-x-4">
            <Tabs value={currentTab} className="space-x-4">
              <TabsList>
                {tabs.map(tab => (
                  <TabsTrigger
                    key={tab.href}
                    value={tab.href}
                    asChild
                  >
                    <Link
                      href={tab.href}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:text-primary",
                        pathname === tab.href
                          ? "border-b-2 border-primary text-primary"
                          : "text-muted-foreground"
                      )}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.title}
                    </Link>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>
      <div className="container">
        {children}
      </div>
    </div>
  )
} 