import { Link } from "@tanstack/react-router"
import {
  ArrowLeftIcon,
  BookOpenCheckIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { DEGREE_AUDIT_INFO } from "./data"
import { Page as PageLayout } from "@/components/shared/page"
import { Button } from "@/components/ui/button"

/**
 * A sibling of the Courses tabs rather than a fifth tab: it is an article
 * about the audit, not another thing to do with your courses, and the old app
 * placed it outside the tab strip too.
 */
export function Page() {
  const { author, disclaimer, signature, introduction, sections } =
    DEGREE_AUDIT_INFO

  return (
    <PageLayout
      title={
        <span className="flex items-start gap-3">
          <BookOpenCheckIcon className="mt-1 size-8 shrink-0" aria-hidden />
          {DEGREE_AUDIT_INFO.title}
        </span>
      }
      description={
        <span className="flex flex-col">
          <span>
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
          </span>
          <span className="text-xs">
            Last updated: {DEGREE_AUDIT_INFO.lastUpdated}
          </span>
        </span>
      }
      width="prose"
    >
      <Button
        nativeButton={false}
        variant="ghost"
        size="sm"
        className="-ml-2.5 self-start"
        render={
          <Link to="/courses/audit">
            <ArrowLeftIcon aria-hidden />
            Back to Degree Audit
          </Link>
        }
      />

      <section className="space-y-3 rounded-lg border border-border bg-muted/50 p-4 text-sm/relaxed">
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
    </PageLayout>
  )
}
