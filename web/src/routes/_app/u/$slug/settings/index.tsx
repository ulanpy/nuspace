import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/u/$slug/settings/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/u/$slug/settings/general",
      params: { slug: params.slug },
    })
  },
})
