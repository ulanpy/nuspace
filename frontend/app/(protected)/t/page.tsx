'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import TicketDetail from '@/features/sgotinish/components/ticket-detail'

function TicketContent() {
  const searchParams = useSearchParams()
  const ticketKey = searchParams.get('key') ?? undefined

  if (!ticketKey) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No ticket key provided</p>
      </div>
    )
  }

  return <TicketDetail ticketKey={ticketKey} />
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <TicketContent />
    </Suspense>
  )
}
