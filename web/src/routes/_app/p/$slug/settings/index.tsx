import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/p/$slug/settings/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/p/$slug/settings/general",
      params: { slug: params.slug },
    })
  },
})
