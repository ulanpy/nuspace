'use client'

/**
 * Communities Page
 * 
 * Handles both list and detail views using query parameters for static export compatibility.
 * - /communities/ → Shows list view
 * - /communities/?id=123 → Shows detail view for community 123
 * 
 * This avoids dynamic route segments which require generateStaticParams with output: 'export'.
 */
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import CommunitiesListPage from '@/features/communities/pages/list'
import CommunityDetailPage from '@/features/communities/pages/single'

function CommunitiesContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')

  // If id query param exists, show detail view
  if (id) {
    return <CommunityDetailPage />
  }

  // Otherwise show list view
  return <CommunitiesListPage />
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <CommunitiesContent />
    </Suspense>
  )
}
