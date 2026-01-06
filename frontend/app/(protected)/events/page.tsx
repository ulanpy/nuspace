'use client'

/**
 * Events List Page
 * 
 * This page wrapper imports the events list content from the features folder.
 * Following Next.js App Router convention: app/ for routing, src/features/ for page content.
 */
import EventsListPage from '@/features/events/pages/list'

export default function Page() {
  return <EventsListPage />
}
