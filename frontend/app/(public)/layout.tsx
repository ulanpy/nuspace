'use client'

import { IconThemeToggle } from '@/components/atoms/icon-theme-toggle'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <div className="fixed top-4 left-4 z-50">
        <IconThemeToggle className="h-12 w-12" size={24} />
      </div>
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
