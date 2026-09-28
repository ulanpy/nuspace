import { useMemo } from "react"

import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  ICONS,
  SERVICES,
  type ContactInfo,
  type ServiceCategory,
} from "./data"
import { findMatchingContacts } from "./search"
import { Page as PageLayout } from "@/components/shared/page"
import { EmptyState } from "@/components/shared/query/boundary"
import { CardGrid } from "@/components/shared/page/card-grid"
import { SearchFilter } from "@/components/shared/list-filters"
import { Card } from "@/components/ui/card"

/**
 * A web link's visible text.
 *
 * Contact URLs are Google Forms and helpdesk links that run past 100
 * characters, and printing them raw wrapped a single link over five lines and
 * buried the surrounding text. The label already says where the link goes, so
 * it becomes the link; unlabelled ones fall back to host plus a short path. The
 * full URL stays available on hover and in the status bar.
 */
function linkText(value: string, label?: string): string {
  if (label) return label
  try {
    const { hostname, pathname } = new URL(value)
    const host = hostname.replace(/^www\./, "")
    const path = pathname.replace(/\/$/, "")
    return path.length > 1 && path.length <= 24 ? `${host}${path}` : host
  } catch {
    return value
  }
}

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

  const isWeb = type === "web"

  return (
    <div className="text-sm">
      {label && !isWeb && <span className="font-medium">{label}: </span>}
      {href ? (
        <a
          href={href}
          title={isWeb ? value : undefined}
          {...(isWeb ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="wrap-break-word text-primary hover:underline"
        >
          {isWeb ? linkText(value, label) : value}
        </a>
      ) : (
        <span className="wrap-break-word text-muted-foreground">{value}</span>
      )}
      {extraInfo && (
        <span className="block text-xs text-muted-foreground">{extraInfo}</span>
      )}
    </div>
  )
}

export function Page({
  q,
  onQChange,
}: {
  q: string
  onQChange: (q: string) => void
}) {
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
    <PageLayout
      title="Find the right office or service"
      description="In an emergency, call campus security or local services immediately."
      width="prose"
    >
      <SearchFilter
        value={q}
        onChange={onQChange}
        label="Search contacts"
        placeholder="Security, counseling, registrar…"
      />

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

                <CardGrid columns={2}>
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
                </CardGrid>
              </section>
            )
          )}
        </div>
      )}
    </PageLayout>
  )
}
