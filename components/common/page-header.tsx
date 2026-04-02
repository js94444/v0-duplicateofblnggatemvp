"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface PageHeaderProps {
  title: string
  description?: string
  showBack?: boolean
  actions?: ReactNode
}

export function PageHeader({ title, description, showBack, actions }: PageHeaderProps) {
  const router = useRouter()

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          {showBack && (
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <span className="mr-1">←</span>
            </Button>
          )}
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center space-x-2">{actions}</div>}
      </div>
    </div>
  )
}
