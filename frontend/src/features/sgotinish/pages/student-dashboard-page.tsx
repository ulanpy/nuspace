'use client'

import { useState } from 'react'
import StudentDashboard from '@/features/sgotinish/components/student-dashboard'
import { useUser } from '@/hooks/use-user'
import { useAuthGate } from '@/hooks/use-auth-gate'
import { AuthWallModal } from '@/components/molecules/auth-wall-modal'
import { CreateAppealButton } from '@/features/sgotinish/components/create-appeal-button'
import CreateTicketModal from '@/features/sgotinish/components/create-ticket-modal'

export default function StudentDashboardPage() {
  const { user } = useUser()
  const { requireAuth, isModalOpen, closeModal } = useAuthGate()
  const [isCreateTicketModalOpen, setCreateTicketModalOpen] = useState(false)

  const handleCreateAppeal = () => requireAuth(() => setCreateTicketModalOpen(true))

  return (
    <>
      <StudentDashboard
        user={user}
        createAppealButton={<CreateAppealButton onClick={handleCreateAppeal} />}
      />
      <CreateTicketModal
        isOpen={isCreateTicketModalOpen}
        onClose={() => setCreateTicketModalOpen(false)}
        onSuccess={() => {
          setCreateTicketModalOpen(false)
        }}
      />
      <AuthWallModal
        isOpen={isModalOpen}
        onClose={closeModal}
        message="You need to be logged in to create a new appeal."
      />
    </>
  )
}
