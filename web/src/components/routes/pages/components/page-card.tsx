import { Link } from "@tanstack/react-router"
import { GlobeIcon, LockIcon } from "lucide-react"

import type { Page } from "@/lib/pages"
import { selectMedia } from "@/lib/media/functions"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

/** The icon and label a card shows for each visibility. */
const VISIBILITY = {
  public: { Icon: GlobeIcon, label: "Public" },
  internal: { Icon: GlobeIcon, label: "NU only" },
  private: { Icon: LockIcon, label: "Private" },
} as const

export function PageCard({ page }: { page: Page }) {
  const avatar = selectMedia(page.media, "profile")?.url
  const banner = selectMedia(page.media, "banner")?.url
  const { Icon, label } = VISIBILITY[page.visibility]

  return (
    <Card className="h-full p-0 transition-shadow hover:shadow-md">
      <Link
        to="/p/$slug"
        params={{ slug: page.slug }}
        className="flex h-full flex-col focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <div className="relative aspect-2/1 bg-page/10">
          <ResilientImage
            src={banner}
            alt={`${page.name} banner`}
            containerClassName="size-full"
            fallback={
              <span className="block size-full bg-page/10" aria-hidden />
            }
          />

          <div className="absolute -bottom-7 left-4 rounded-full bg-card p-1 shadow-sm">
            <ResilientImage
              src={avatar}
              alt={`${page.name} profile`}
              containerClassName="size-14 rounded-full"
              fallback={
                <span
                  aria-hidden
                  className="grid size-full place-items-center bg-page/15 text-lg font-semibold text-page"
                >
                  {page.name.charAt(0).toUpperCase()}
                </span>
              }
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 px-4 pt-9 pb-4">
          <h3 className="truncate font-semibold">{page.name}</h3>

          {page.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {page.description}
            </p>
          ) : null}

          <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
            <Badge variant="secondary">
              <Icon className="size-3" aria-hidden />
              {label}
            </Badge>
          </div>
        </div>
      </Link>
    </Card>
  )
}
