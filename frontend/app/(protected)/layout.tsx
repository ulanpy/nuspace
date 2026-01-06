'use client'

import { MediaUploadProvider } from '@/context/media-upload-context'
import { MediaEditProvider } from '@/context/media-edit-context'
import { Sidebar } from '@/components/layout/sidebar'
import { Toasts } from '@/components/atoms/toast'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MediaUploadProvider>
      <MediaEditProvider>
        <div className="min-h-screen bg-background">
          {/* Sidebar component handles both desktop fixed sidebar and mobile hamburger/sheet */}
          <Sidebar />

          {/* Main content area with left margin on desktop to account for sidebar */}
          <main className="min-h-screen ml-0 sidebar-margin pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
            <div className="container py-4 sm:py-6 px-3 sm:px-4">
              {children}
            </div>
          </main>

          {/* Toast notifications */}
          <Toasts />
        </div>
      </MediaEditProvider>
    </MediaUploadProvider>
  )
}
