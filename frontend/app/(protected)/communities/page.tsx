'use client'

/**
 * Communities List Page
 * 
 * This page wrapper imports the communities list content from the features folder.
 * Following Next.js App Router convention: app/ for routing, src/features/ for page content.
 */
import CommunitiesListPage from '@/features/communities/pages/list'

export default function Page() {
  return <CommunitiesListPage />
}
