'use client'

/**
 * Opportunities Page
 * 
 * This page wrapper imports the opportunities content from the features folder.
 * Following Next.js App Router convention: app/ for routing, src/features/ for page content.
 */
import OpportunitiesPageContent from '@/features/opportunities/pages/opportunities-page'

export default function Page() {
  return <OpportunitiesPageContent />
}
