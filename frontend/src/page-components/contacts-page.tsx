'use client'

import { ContactsInfoSection } from '@/components/organisms/contacts-info-section'
import MotionWrapper from '@/components/shared/motion-wrapper'
import { PageContainer } from '@/components/shared/page-container'
import { PageHeader } from '@/components/shared/page-header'

export default function ContactsPage() {
  return (
    <MotionWrapper>
      <PageContainer as="main" maxWidth="default" padding="default">
        <PageHeader
          title="Find the right office or service"
          subtitle="In an emergency, call campus security or local services immediately."
        />
        <ContactsInfoSection />
      </PageContainer>
    </MotionWrapper>
  )
}
