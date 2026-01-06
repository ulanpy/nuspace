'use client'

/**
 * Events Page
 * 
 * Handles both list and detail views using query parameters for static export compatibility.
 * - /events/ → Shows list view
 * - /events/?id=123 → Shows detail view for event 123
 */
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import EventsListPage from '@/features/events/pages/list'
import EventDetailPage from '@/features/events/pages/single'

function EventsContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')

  if (id) {
    return <EventDetailPage />
  }

  return <EventsListPage />
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <EventsContent />
    </Suspense>
  )
}
