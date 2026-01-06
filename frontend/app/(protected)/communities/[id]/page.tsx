/**
 * Community Detail Page
 */
import CommunityDetailPageContent from '@/features/communities/pages/single'

// Required for static export with dynamic routes
// Generates a placeholder page - actual ID is handled client-side
export function generateStaticParams() {
  return [{ id: 'placeholder' }]
}

export default function Page() {
  return <CommunityDetailPageContent />
}
