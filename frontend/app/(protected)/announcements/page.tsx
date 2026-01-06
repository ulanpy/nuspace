'use client'

/**
 * Announcements Page
 * 
 * This page wrapper imports the announcements content from the features folder.
 * Following Next.js App Router convention: app/ for routing, src/features/ for page content.
 */
import AnnouncementsPageContent from '@/features/announcements/pages/announcements-page'

export default function Page() {
  return <AnnouncementsPageContent />
}
