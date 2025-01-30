import { LayoutIcon, Bot, Paintbrush, Settings, BarChart } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import Link from "next/link"

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
      title: "Inhalte",
      href: `/admin/templates/${params.id}`,
      icon: LayoutIcon
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
      title: "Meta",
      href: `/admin/templates/${params.id}/meta`,
      icon: Settings
    },
    {
      title: "Analytics",
      href: `/admin/templates/${params.id}/analytics`,
      icon: BarChart
    }
  ]

  return (
    <div className="space-y-6">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center space-x-4">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
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
            ))}
          </div>
        </div>
      </div>
      <div className="container">
        {children}
      </div>
    </div>
  )
} 