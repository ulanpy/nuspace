'use client'

/**
 * Degree Audit Info Page
 * 
 * This page wrapper imports the degree audit info content from the features folder.
 * Following Next.js App Router convention: app/ for routing, src/features/ for page content.
 */
import DegreeAuditInfoPageContent from '@/features/courses/pages/degree-audit-info-page'

export default function Page() {
  return <DegreeAuditInfoPageContent />
}
