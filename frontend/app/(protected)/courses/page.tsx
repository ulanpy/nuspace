'use client'

/**
 * Courses Page (Grade Statistics)
 * 
 * This page wrapper imports the grade statistics content from the features folder.
 * Following Next.js App Router convention: app/ for routing, src/features/ for page content.
 */
import GradeStatisticsPageContent from '@/features/courses/pages/grade-statistics-page'

export default function Page() {
  return <GradeStatisticsPageContent />
}
