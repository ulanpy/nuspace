import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { HeaderSearch, SearchScreen } from "@/components/routes/search"
import { SEARCH_KINDS } from "@/lib/search"
import { sessionQueryOptions } from "@/lib/user"

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  kind: z.enum(SEARCH_KINDS).optional().catch(undefined),
  returnTo: z.string().optional(),
})

/** `nuspace.kz/`: the search front door; with `?q=`, the results. */
export const Route = createFileRoute("/_public/")({
  validateSearch: searchSchema,
  beforeLoad: ({ context }) =>
    context.queryClient.ensureQueryData(sessionQueryOptions),
  staticData: { shell: { search: HeaderSearch } },
  component: SearchRoute,
})

function SearchRoute() {
  const { q, kind } = Route.useSearch()
  return <SearchScreen q={q} kind={kind} />
}
