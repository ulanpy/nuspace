'use client'

/**
 * Landing Page (Home)
 * 
 * This page wrapper imports the landing page content from the pages folder.
 * Following Next.js App Router convention: app/ for routing, src/pages/ for page content.
 */
import LandingPageContent from '@/page-components/landing-page'

export default function Page() {
  return <LandingPageContent />
}
