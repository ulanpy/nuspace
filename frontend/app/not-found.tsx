'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to home page after brief delay
    const timeout = setTimeout(() => {
      router.replace('/')
    }, 100)
    return () => clearTimeout(timeout)
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <h2 className="text-xl font-semibold mb-4">Page not found</h2>
      <p className="text-muted-foreground">Redirecting to home...</p>
    </div>
  )
}
