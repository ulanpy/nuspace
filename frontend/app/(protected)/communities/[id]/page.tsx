/**
 * Community Detail Page
 * 
 * Server component wrapper for static export compatibility.
 * generateStaticParams returns empty array - pages are rendered client-side.
 */
import CommunityDetailPageClient from './client'

// Required for static export with dynamic routes
// Empty array means no pages pre-rendered at build time
// Client-side routing handles all dynamic IDs
export function generateStaticParams() {
  return []
}

export default function Page() {
  return <CommunityDetailPageClient />
}
