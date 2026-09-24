'use client'

import { IconThemeToggle } from '@/components/shared/icon-theme-toggle'

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <div
        className="fixed left-4 z-50"
        style={{ top: 'calc(var(--site-notice-height) + 1rem)' }}
      >
        <IconThemeToggle className="h-12 w-12" size={24} />
      </div>
      <main className="flex-1">{children}</main>
    </div>
  )
}
