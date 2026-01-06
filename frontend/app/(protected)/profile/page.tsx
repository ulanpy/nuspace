'use client'

/**
 * Profile Page
 * 
 * This page wrapper imports the profile content from the features folder.
 * Following Next.js App Router convention: app/ for routing, src/features/ for page content.
 */
import ProfilePageContent from '@/features/profile/profile-page'

export default function Page() {
  return <ProfilePageContent />
}
