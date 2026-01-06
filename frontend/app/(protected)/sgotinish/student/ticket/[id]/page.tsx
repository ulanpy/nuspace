/**
 * Student Ticket Detail Page
 */
import TicketDetailPageContent from '@/features/sgotinish/pages/ticket-detail-page'

// Required for static export with dynamic routes
// Generates a placeholder page - actual ID is handled client-side
export function generateStaticParams() {
  return [{ id: 'placeholder' }]
}

export default function Page() {
  return <TicketDetailPageContent />
}
