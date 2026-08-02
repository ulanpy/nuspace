import { useEffect } from 'react'
import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { Providers } from '@/providers'
import { PublicLayout } from '@/layouts/public-layout'
import { ProtectedLayout } from '@/layouts/protected-layout'
import { EventsLayout } from '@/layouts/events-layout'
import { useRouter, useSearchParams } from '@/router/navigation'
import { useUser } from '@/hooks/use-user'
import { ServerError } from '@/components/molecules/server-error'
import LandingPageContent from '@/page-components/landing-page'
import AboutPageContent from '@/page-components/about-page'
import PrivacyPolicyPage from '@/page-components/privacy-policy-page'
import TermsOfServicePage from '@/page-components/terms-of-service-page'
import AnnouncementsPageContent from '@/features/announcements/pages/announcements-page'
import ContactsPageContent from '@/page-components/contacts-page'
import GradeStatisticsPageContent from '@/features/courses/pages/grade-statistics-page'
import DegreeAuditInfoPageContent from '@/features/courses/pages/degree-audit-info-page'
import DormEatsPageContent from '@/page-components/apps/dorm-eats'
import OpportunitiesPageContent from '@/features/opportunities/pages/opportunities-page'
import ProfilePageContent from '@/features/profile/profile-page'
import SgotinishPageContent from '@/features/sgotinish/pages/sgotinish-page'
import CommunitiesListPage from '@/features/communities/pages/list'
import CommunityDetailPage from '@/features/communities/pages/single'
import EventsListPage from '@/features/events/pages/list'
import EventDetailPage from '@/features/events/pages/single'

function RootComponent() {
  return (
    <Providers>
      <Outlet />
    </Providers>
  )
}

function RouteErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : undefined

  return <ServerError status={status} onRetry={reset} />
}

function NotFoundComponent() {
  const router = useRouter()

  useEffect(() => {
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

function LandingRoute() {
  const router = useRouter()
  const { user, isLoading } = useUser()

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/announcements')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (user) {
    return null
  }

  return (
    <PublicLayout>
      <LandingPageContent />
    </PublicLayout>
  )
}

function CommunitiesRoute() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  return <ProtectedLayout>{id ? <CommunityDetailPage /> : <CommunitiesListPage />}</ProtectedLayout>
}

function EventsRoute() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  return (
    <ProtectedLayout>
      <EventsLayout>{id ? <EventDetailPage /> : <EventsListPage />}</EventsLayout>
    </ProtectedLayout>
  )
}

const rootRoute = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: RouteErrorComponent,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingRoute,
})

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: () => (
    <PublicLayout>
      <AboutPageContent />
    </PublicLayout>
  ),
})

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/privacy-policy',
  component: () => (
    <PublicLayout>
      <PrivacyPolicyPage />
    </PublicLayout>
  ),
})

const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/terms-of-service',
  component: () => (
    <PublicLayout>
      <TermsOfServicePage />
    </PublicLayout>
  ),
})

const announcementsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/announcements',
  component: () => (
    <ProtectedLayout>
      <AnnouncementsPageContent />
    </ProtectedLayout>
  ),
})

const contactsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/contacts',
  component: () => (
    <ProtectedLayout>
      <ContactsPageContent />
    </ProtectedLayout>
  ),
})

const coursesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/courses',
  component: () => (
    <ProtectedLayout>
      <GradeStatisticsPageContent />
    </ProtectedLayout>
  ),
})

const degreeAuditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/degree-audit-info',
  component: () => (
    <ProtectedLayout>
      <DegreeAuditInfoPageContent />
    </ProtectedLayout>
  ),
})

const dormEatsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dorm-eats',
  component: () => (
    <ProtectedLayout>
      <DormEatsPageContent />
    </ProtectedLayout>
  ),
})

const opportunitiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/opportunities',
  component: () => (
    <ProtectedLayout>
      <OpportunitiesPageContent />
    </ProtectedLayout>
  ),
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: () => (
    <ProtectedLayout>
      <ProfilePageContent />
    </ProtectedLayout>
  ),
})

const sgotinishRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sgotinish',
  component: () => (
    <ProtectedLayout>
      <SgotinishPageContent />
    </ProtectedLayout>
  ),
})

const communitiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/communities',
  component: CommunitiesRoute,
})

const eventsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/events',
  component: EventsRoute,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  aboutRoute,
  privacyRoute,
  termsRoute,
  announcementsRoute,
  communitiesRoute,
  contactsRoute,
  coursesRoute,
  degreeAuditRoute,
  dormEatsRoute,
  eventsRoute,
  opportunitiesRoute,
  profileRoute,
  sgotinishRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
