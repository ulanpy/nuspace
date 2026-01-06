'use client'

/**
 * Contacts Page
 * 
 * This page wrapper imports the contacts content from the pages folder.
 * Following Next.js App Router convention: app/ for routing, src/pages/ for page content.
 */
import ContactsPageContent from '@/page-components/contacts-page'

export default function Page() {
  return <ContactsPageContent />
}
