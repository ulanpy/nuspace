'use client'

import { ContactsInfoSection } from '@/components/organisms/contacts-info-section'
import MotionWrapper from '@/components/atoms/motion-wrapper'

export default function ContactsPage() {
  return (
    <MotionWrapper>
      <main className="container mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <div className="mb-7 max-w-2xl">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Contacts & Essential Services
          </h1>
          <p className="mt-2 leading-relaxed text-gray-600 dark:text-gray-400">
            Save these contacts. In an emergency, call campus security or local services immediately.
          </p>
        </div>
        <ContactsInfoSection />
      </main>
    </MotionWrapper>
  )
}
