'use client'

/**
 * Landing Page (Home)
 * 
 * This page wrapper imports the landing page content from the pages folder.
 * Following Next.js App Router convention: app/ for routing, src/pages/ for page content.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LandingPageContent from '@/page-components/landing-page'
import { useUser } from '@/hooks/use-user'

export default function Page() {
  const router = useRouter()
  const { user, isLoading } = useUser()

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/announcements')
    }
  }, [user, isLoading, router])

  // Show landing page while loading or if not authenticated
  return <LandingPageContent />
}
