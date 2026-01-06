'use client'

import StudentDashboard from '@/features/sgotinish/components/student-dashboard'
import { useUser } from '@/hooks/use-user'
import { CreateAppealButton } from '@/features/sgotinish/components/create-appeal-button'
import { useState } from 'react'
import { LoginModal } from '@/components/molecules/login-modal'
import CreateTicketModal from '@/features/sgotinish/components/create-ticket-modal'

export default function StudentDashboardPage() {
  const { user, login } = useUser()
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isCreateTicketModalOpen, setCreateTicketModalOpen] = useState(false)

  const handleCreateAppeal = () => {
    if (!user) {
      setIsLoginModalOpen(true)
    } else {
      setCreateTicketModalOpen(true)
    }
  }

  const handleLogin = () => {
    login()
    setIsLoginModalOpen(false)
  }

  return (
    <>
      <StudentDashboard
        user={user}
        createAppealButton={<CreateAppealButton onClick={handleCreateAppeal} />}
      />
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLogin}
        title="Login Required"
        message="You need to be logged in to create a new appeal."
      />
      <CreateTicketModal
        isOpen={isCreateTicketModalOpen}
        onClose={() => setCreateTicketModalOpen(false)}
        onSuccess={() => {
          setCreateTicketModalOpen(false)
        }}
      />
    </>
  )
}
