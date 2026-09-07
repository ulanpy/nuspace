import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"

import { Page } from "@/components/routes/contacts"

const contactsSearchSchema = z.object({
  q: z.string().optional(),
})

export const Route = createFileRoute("/_app/contacts/")({
  validateSearch: contactsSearchSchema,
  component: ContactsRoute,
})

function ContactsRoute() {
  const { q = "" } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <Page
      q={q}
      onQChange={(next) => {
        // Search lives in the URL, so a result set is shareable.
        void navigate({
          search: next ? { q: next } : {},
          replace: true,
        })
      }}
    />
  )
}
