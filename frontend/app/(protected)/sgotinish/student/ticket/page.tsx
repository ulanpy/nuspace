'use client'

/**
 * Student Ticket Page
 * 
 * Handles ticket detail view using query parameters for static export compatibility.
 * URL format: /sgotinish/student/ticket/?id=123
 * 
 * Note: This page only renders ticket details. For ticket list, navigate to /sgotinish/student/
 */
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import TicketDetailPageContent from '@/features/sgotinish/pages/ticket-detail-page'

function TicketContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')

  if (!id) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No ticket ID provided</p>
      </div>
    )
  }

  return <TicketDetailPageContent />
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <TicketContent />
    </Suspense>
  )
}
