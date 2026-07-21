import type { ReactNode } from "react"
import { Button } from "@/components/atoms/button"
import { useUser } from "@/hooks/use-user"

interface SignInCardProps {
  icon: ReactNode
  title: string
  description: string
}

export function SignInCard({ icon, title, description }: SignInCardProps) {
  const { login } = useUser()

  return (
    <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-1">{description}</p>
      <Button onClick={login} size="sm" className="mt-5">
        Login
      </Button>
    </div>
  )
}
