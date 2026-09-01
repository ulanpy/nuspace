import { ExternalLinkIcon, MailIcon, PhoneIcon } from "lucide-react"

import type { LegalDocument } from "@/features/legal/content"
import { PageContainer } from "@/components/page-container"
import { PageHeader } from "@/components/page-header"
import { Section } from "@/components/section"

function ContactLink({
  href,
  icon: Icon,
  label,
  value,
  external,
}: {
  href: string
  icon: typeof MailIcon
  label: string
  value: string
  external?: boolean
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 transition-colors hover:border-foreground hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Icon className="size-6" aria-hidden />
      <span className="font-medium">{label}</span>
      <span className="text-xs break-all text-muted-foreground">{value}</span>
    </a>
  )
}

/**
 * Both legal documents render identically, so they share a renderer rather than
 * two near-copies of the same 130-line page. Section numbers come from position
 * — the old data carried a hand-written `id` that had to stay in sync with the
 * order.
 */
export function LegalPage({ document }: { document: LegalDocument }) {
  return (
    <PageContainer as="article" maxWidth="prose" className="space-y-10 py-8">
      <div className="space-y-4">
        <PageHeader
          eyebrow="Nuspace policies"
          title={document.title}
          description={`Last updated: ${document.lastUpdated}`}
        />
        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <p className="leading-relaxed">{document.introduction}</p>
        </div>
      </div>

      <div className="space-y-8">
        {document.sections.map((section, index) => (
          <Section key={section.title} spacing="none" className="space-y-3">
            <h2 className="text-2xl font-bold">
              {index + 1}. {section.title}
            </h2>

            {section.description && (
              <p className="leading-relaxed text-muted-foreground">
                {section.description}
              </p>
            )}

            {section.points && (
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            )}
          </Section>
        ))}
      </div>

      <Section spacing="none" className="space-y-6 border-t border-border pt-8">
        <h2 className="text-2xl font-bold">Contact</h2>
        <p className="text-muted-foreground">{document.contact.message}</p>
        <div className="grid gap-4 text-center sm:grid-cols-3">
          <ContactLink
            href={`mailto:${document.contact.email}`}
            icon={MailIcon}
            label="Email"
            value={document.contact.email}
          />
          <ContactLink
            href={`tel:${document.contact.phone.replace(/\s+/g, "")}`}
            icon={PhoneIcon}
            label="Phone"
            value={document.contact.phone}
          />
          <ContactLink
            href={document.contact.telegram}
            icon={ExternalLinkIcon}
            label="Telegram"
            value={document.contact.telegramHandle}
            external
          />
        </div>
      </Section>
    </PageContainer>
  )
}
