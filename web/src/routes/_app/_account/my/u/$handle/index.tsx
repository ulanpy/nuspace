import { createFileRoute, notFound } from "@tanstack/react-router"

import { ApiError } from "@/api/client"
import { ProfileScreen } from "@/components/routes/my/u/$handle"
import { NotFound } from "@/components/shared/not-found"
import { profileQueryOptions } from "@/lib/profiles"

/** `my.nuspace.kz/u/<handle>`: a profile page. */
export const Route = createFileRoute("/_app/_account/my/u/$handle/")({
  // A rendered page, like a Page: its own compact bar, no site chrome.
  staticData: { shell: { bare: true } },
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(
        profileQueryOptions(params.handle)
      )
    } catch (error) {
      // No such handle, and a profile this viewer may not read, are the same
      // 404, and never a sign-in redirect: that would confirm it exists.
      if (error instanceof ApiError && error.status === 404) {
        throw notFound()
      }
      throw error
    }
  },
  notFoundComponent: () => (
    <NotFound
      title="Profile not found"
      description="Nobody has that handle, or their profile is private."
    />
  ),
  component: ProfileRoute,
})

function ProfileRoute() {
  const { handle } = Route.useParams()

  return <ProfileScreen handle={handle} />
}
