'use client'

/**
 * Student Dashboard Page
 * 
 * This page wrapper imports the student dashboard content from the features folder.
 * Following Next.js App Router convention: app/ for routing, src/features/ for page content.
 */
import StudentDashboardPageContent from '@/features/sgotinish/pages/student-dashboard-page'

export default function Page() {
  return <StudentDashboardPageContent />
}
