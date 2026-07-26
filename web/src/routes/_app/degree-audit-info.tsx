import { Link, createFileRoute } from "@tanstack/react-router"
import {
  ArrowLeftIcon,
  BookOpenCheckIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { DEGREE_AUDIT_INFO } from "@/features/courses/degree-audit-info"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/_app/degree-audit-info")({
  component: DegreeAuditInfo,
})

/**
 * A sibling of the Courses tabs rather than a fifth tab: it is an article
 * about the audit, not another thing to do with your courses, and the old app
 * placed it outside the tab strip too.
 */
function DegreeAuditInfo() {
  const { author, disclaimer, signature, introduction, sections } =
    DEGREE_AUDIT_INFO

  return (
    <article className="mx-auto max-w-prose space-y-10 py-8">
      <header className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2.5"
          render={
            <Link to="/courses/audit">
              <ArrowLeftIcon aria-hidden />
              Back to Degree Audit
            </Link>
          }
        />

        <div className="flex items-start gap-3">
          <BookOpenCheckIcon className="mt-1 size-8 shrink-0" aria-hidden />
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-balance">
              {DEGREE_AUDIT_INFO.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              By{" "}
              <a
                href={author.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-3 hover:text-foreground"
              >
                {author.name}
              </a>
              , {author.role}
            </p>
            <p className="text-xs text-muted-foreground">
              Last updated: {DEGREE_AUDIT_INFO.lastUpdated}
            </p>
          </div>
        </div>
      </header>

      <section className="space-y-3 rounded-lg border border-border bg-muted/50 p-4 text-sm leading-relaxed">
        <p className="flex items-center gap-2 font-medium">
          <TriangleAlertIcon className="size-4 shrink-0" aria-hidden />
          This is a guide, not a confirmation
        </p>
        {disclaimer.map((paragraph) => (
          <p key={paragraph} className="text-muted-foreground">
            {paragraph}
          </p>
        ))}
        <p className="text-muted-foreground">
          Best wishes,{" "}
          <a
            href={signature.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-3 hover:text-foreground"
          >
            {signature.text}
          </a>
        </p>
      </section>

      <div className="space-y-3 leading-relaxed">
        {introduction.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-2xl font-bold">{section.title}</h2>

            {"description" in section && (
              <p className="leading-relaxed text-muted-foreground">
                {section.description}
              </p>
            )}

            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              {section.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>

            {"footnote" in section && (
              <p className="leading-relaxed text-muted-foreground">
                {section.footnote}
              </p>
            )}
          </section>
        ))}
      </div>
    </article>
  )
}
