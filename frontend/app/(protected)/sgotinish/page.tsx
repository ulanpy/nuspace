'use client'

/**
 * Sgotinish Landing Page
 * 
 * This page wrapper imports the sgotinish landing content from the features folder.
 * Following Next.js App Router convention: app/ for routing, src/features/ for page content.
 */
import SgotinishPageContent from '@/features/sgotinish/pages/sgotinish-page'

export default function Page() {
  return <SgotinishPageContent />
}
