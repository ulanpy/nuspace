'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/context/theme-provider-context'
import { SnowProvider, useSnowEnabled } from '@/config/seasonal'
import { Snowfall } from '@/components/animations/snowfall'

// Create QueryClient inside component to avoid sharing state between requests
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 10,
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}

function SnowIfEnabled() {
  const enabled = useSnowEnabled()
  return enabled ? <Snowfall /> : null
}

export function Providers({ children }: { children: React.ReactNode }) {
  // NOTE: Avoid useState when initializing the query client if you don't
  // have a suspense boundary between this and the code that may suspend
  // because React will throw away the client on the initial render if it
  // suspends and there is no boundary
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="nuspace-ui-theme">
        <SnowProvider>
          <SnowIfEnabled />
          {children}
        </SnowProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
