'use client'

/**
 * SG Dashboard Page
 * 
 * This page wrapper imports the SG dashboard content from the features folder.
 * Following Next.js App Router convention: app/ for routing, src/features/ for page content.
 */
import SGDashboardPageContent from '@/features/sgotinish/pages/sg-dashboard-page'

export default function Page() {
  return <SGDashboardPageContent />
}
