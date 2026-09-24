import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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

function isMourningNoticeVisible() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Almaty',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts()
  const date = Object.fromEntries(
    parts
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value]),
  )

  return `${date.year}-${date.month}-${date.day}` <= '2026-09-25'
}

function RootComponent() {
  const bannerRef = useRef<HTMLElement>(null)
  const [bannerHeight, setBannerHeight] = useState(0)
  const [isNoticeVisible, setIsNoticeVisible] = useState(isMourningNoticeVisible)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIsNoticeVisible(isMourningNoticeVisible())
    }, 60_000)

    return () => window.clearInterval(interval)
  }, [])

  useLayoutEffect(() => {
    if (!isNoticeVisible) {
      setBannerHeight(0)
      return
    }

    const banner = bannerRef.current
    if (!banner) return

    const updateHeight = () => setBannerHeight(banner.getBoundingClientRect().height)
    updateHeight()

    const observer = new ResizeObserver(updateHeight)
    observer.observe(banner)
    return () => observer.disconnect()
  }, [isNoticeVisible])

  return (
    <Providers>
      <div style={{ '--site-notice-height': `${bannerHeight}px` } as React.CSSProperties}>
        {isNoticeVisible && (
          <aside
            ref={bannerRef}
            aria-label="Announcement"
            className="flex min-h-10 items-center justify-center bg-zinc-950 px-4 py-2 text-center text-xs font-medium leading-5 text-zinc-100 sm:text-sm"
          >
            September 25 — National Day of Mourning in the Republic of Kazakhstan
          </aside>
        )}
        <Outlet />
      </div>
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
  const id = searchParams.get('id')?.replace(/^"|"$/g, '')
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
