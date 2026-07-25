'use client'

import { Sidebar } from '@/components/layout/sidebar'

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="min-h-screen ml-0 sidebar-margin pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
        <div className="container py-4 sm:py-6 px-3 sm:px-4">{children}</div>
      </main>
    </div>
  )
}
