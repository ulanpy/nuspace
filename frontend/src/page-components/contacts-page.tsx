'use client'

import { ContactsInfoSection } from '@/components/organisms/contacts-info-section'
import MotionWrapper from '@/components/atoms/motion-wrapper'

export default function ContactsPage() {
  return (
    <MotionWrapper>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Contacts & Essential Services
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Save these contacts. In an emergency, call campus security or local services immediately.
          </p>
        </div>
        <ContactsInfoSection />
      </div>
    </MotionWrapper>
  )
}
