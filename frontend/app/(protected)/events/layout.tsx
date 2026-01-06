'use client'

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6 pb-20">
      <div className="w-full">
        {children}
      </div>
    </div>
  )
}
