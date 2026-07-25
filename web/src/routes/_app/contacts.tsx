import { useMemo } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { SearchIcon } from "lucide-react"
import { z } from "zod"

import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  ICONS,
  SERVICES,
  type ContactInfo,
  type ServiceCategory,
} from "@/features/contacts/data"
import { findMatchingContacts } from "@/features/contacts/search"
import { EmptyState } from "@/components/query-boundary"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const contactsSearchSchema = z.object({
  q: z.string().optional(),
})

export const Route = createFileRoute("/_app/contacts")({
  validateSearch: contactsSearchSchema,
  component: Contacts,
})

function ContactValue({ contact }: { contact: ContactInfo }) {
  const { type, value, label, extraInfo } = contact

  const href =
    type === "phone"
      ? `tel:${value.replace(/[^\d+]/g, "")}`
      : type === "email"
        ? `mailto:${value}`
        : type === "web"
          ? value
          : undefined

  return (
    <div className="text-sm">
      {label && <span className="font-medium">{label}: </span>}
      {href ? (
        <a
          href={href}
          {...(type === "web"
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          className="break-words text-primary hover:underline"
        >
          {value}
        </a>
      ) : (
        <span className="break-words text-muted-foreground">{value}</span>
      )}
      {extraInfo && (
        <span className="block text-xs text-muted-foreground">{extraInfo}</span>
      )}
    </div>
  )
}

function Contacts() {
  const { q = "" } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const matches = useMemo(() => findMatchingContacts(SERVICES, q), [q])

  const byCategory = useMemo(() => {
    const grouped = new Map<ServiceCategory, typeof matches>()
    for (const match of matches) {
      const list = grouped.get(match.service.category) ?? []
      list.push(match)
      grouped.set(match.service.category, list)
    }
    return grouped
  }, [matches])

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Find the right office or service
        </h1>
        <p className="text-muted-foreground">
          In an emergency, call campus security or local services immediately.
        </p>
      </header>

      <div className="space-y-2">
        <Label htmlFor="contacts-search">Search contacts</Label>
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="contacts-search"
            type="search"
            value={q}
            placeholder="Security, counseling, registrar…"
            className="pl-9"
            onChange={(event) => {
              const next = event.target.value
              // Search lives in the URL, so a result set is shareable.
              void navigate({
                search: next ? { q: next } : {},
                replace: true,
              })
            }}
          />
        </div>
      </div>

      {matches.length === 0 ? (
        <EmptyState
          title="No matches"
          description={`Nothing found for "${q}".`}
        />
      ) : (
        <div className="space-y-8">
          {CATEGORY_ORDER.filter((category) => byCategory.has(category)).map(
            (category) => (
              <section key={category} className="space-y-3">
                <h2 className="text-xl font-semibold">
                  {CATEGORY_LABELS[category]}
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  {(byCategory.get(category) ?? []).map(
                    ({ service, contacts }) => {
                      const Icon = ICONS[service.icon]
                      return (
                        <Card key={service.id} className="space-y-3 p-4">
                          <div className="flex items-start gap-3">
                            <span
                              aria-hidden
                              className="grid size-10 shrink-0 place-items-center rounded-lg bg-contact/15 text-contact"
                            >
                              <Icon className="size-5" />
                            </span>
                            <div className="min-w-0">
                              <h3 className="font-semibold">{service.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {service.description}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            {contacts.map((contact) => (
                              <ContactValue
                                key={contact.id ?? contact.value}
                                contact={contact}
                              />
                            ))}
                          </div>
                        </Card>
                      )
                    }
                  )}
                </div>
              </section>
            )
          )}
        </div>
      )}
    </div>
  )
}
