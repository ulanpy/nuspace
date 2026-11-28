import { Link } from "@tanstack/react-router"
import type { LinkProps } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { ResilientImage } from "@/components/shared/media/resilient-image"

export interface PageCardProps {
  name: string
  description?: string | null
  /** The wide strip at the top. */
  banner?: string | null
  /** The round picture that overlaps it. */
  avatar?: string | null
  /** Where the card goes, as a plain address. */
  href?: string
  /**
   * Where the card goes, as a route. Prefer it for a Page: the router turns it
   * into the host that serves it, and follows it without a reload when that is
   * this one. Wins over `href`; omit both for a card that is not a link.
   */
  link?: Pick<LinkProps, "to" | "params">
  /**
   * Buttons on the card, under the body. The directory cards have none; the
   * ones on a page you manage do, and the same card carries both.
   */
  actions?: ReactNode
  className?: string
}

/**
 * The card a Page is shown as: banner, avatar, name, and a line of description.
 *
 * One card for every place a Page is listed — the directory, the people
 * directory, and the pages you manage — so a page looks the same wherever you
 * meet it. The pages you manage add buttons to it; the directories do not.
 *
 * No visibility badge. A list only ever holds pages the viewer may see, which
 * is a mix of `public` and `internal`, so the badge said the same two things
 * everywhere and meant nothing.
 */
export function PageCard({
  name,
  description,
  banner,
  avatar,
  href,
  link,
  actions,
  className,
}: PageCardProps) {
  const body = (
    <>
      <div className="relative aspect-2/1 bg-page/10">
        <ResilientImage
          src={banner ?? null}
          alt={`${name} banner`}
          containerClassName="size-full"
          fallback={<span className="block size-full bg-page/10" aria-hidden />}
        />

        <div className="absolute -bottom-7 left-4 rounded-full bg-card p-1 shadow-sm">
          <ResilientImage
            src={avatar ?? null}
            alt={`${name} picture`}
            containerClassName="size-14 rounded-full"
            fallback={
              <span
                aria-hidden
                className="grid size-full place-items-center bg-page/15 text-lg font-semibold text-page"
              >
                {name.charAt(0).toUpperCase()}
              </span>
            }
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4 pt-9 pb-4">
        <h3 className="truncate font-semibold">{name}</h3>

        {description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </>
  )

  return (
    <Card
      className={cn("h-full p-0 transition-shadow hover:shadow-md", className)}
    >
      {link ? (
        <Link
          {...link}
          className="flex h-full flex-col focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {body}
        </Link>
      ) : href ? (
        <a
          href={href}
          className="flex h-full flex-col focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {body}
        </a>
      ) : (
        <div className="flex h-full flex-col">{body}</div>
      )}

      {actions ? (
        <div className="flex items-center gap-2 border-t px-4 py-3">
          {actions}
        </div>
      ) : null}
    </Card>
  )
}
