import { useMemo } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'

type NavigateTarget = string
type NavigateOptions = { scroll?: boolean }

export function useRouter() {
  const navigate = useNavigate()

  return {
    push: (to: NavigateTarget, _options?: NavigateOptions) => navigate({ to }),
    replace: (to: NavigateTarget, _options?: NavigateOptions) =>
      navigate({ to, replace: true }),
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    refresh: () => window.location.reload(),
  }
}

export function usePathname() {
  return useLocation({ select: (state) => state.pathname })
}

export function useSearchParams() {
  const searchStr = useLocation({ select: (state) => state.searchStr })
  return useMemo(() => new URLSearchParams(searchStr), [searchStr])
}
