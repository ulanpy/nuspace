import { useEffect, useRef, useState } from "react"
import { BadgeCheckIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { apiErrorMessage } from "@/api/errors"
import { qk } from "@/api/query-keys"
import type { Community } from "@/lib/communities"
import { fetchCommunitiesPage } from "@/lib/communities"
import { selectMedia } from "@/lib/media/functions"
import { fetchUserPage, fetchUsersPage } from "@/lib/user"
import type { UserSummary } from "@/lib/user"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import { useDebounced } from "@/hooks/use-debounced"
import { InfiniteList } from "@/components/shared/query/infinite-list"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { ToggleChip } from "@/components/shared/toggle-chip"
import { pageEditorConfig } from "@/components/shared/page-editor/config"
import { applyTemplate } from "@/components/shared/page-editor/components/_lib/template"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"

const SOURCES = [
  { id: "people", label: "People" },
  { id: "communities", label: "Communities" },
] as const

type SourceId = (typeof SOURCES)[number]["id"]

/** Puck writes an empty page with an empty content array and a root. */
function hasContent(pageContent: unknown): boolean {
  const content = (pageContent as { content?: unknown } | null)?.content
  return Array.isArray(content) && content.length > 0
}

export function TemplateDialog({
  open,
  onOpenChange,
  onApply,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (data: Record<string, unknown>) => void
}) {
  const [source, setSource] = useState<SourceId>("people")
  const [input, setInput] = useState("")
  const keyword = useDebounced(input)
  const filters = { keyword: keyword || undefined }
  const searchRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => searchRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [open])

  const communities = useInfiniteList({
    enabled: open && source === "communities",
    // Communities have no public flag at all, so this list is unfiltered by
    // design: a template is a design, and visibility says nothing about that.
    queryKey: qk.communities.list(filters),
    fetchPage: (page) => fetchCommunitiesPage(filters, page),
  })

  const people = useInfiniteList({
    enabled: open && source === "people",
    queryKey: qk.users.list(filters),
    fetchPage: (page) => fetchUsersPage(filters, page),
    // A user summary has no `id` — `sub` is the identity.
    getId: (user: UserSummary) => user.sub,
  })

  const apply = (pageContent: unknown) => {
    onOpenChange(false)
    setInput("")
    onApply(
      applyTemplate(pageContent as Record<string, unknown>, pageEditorConfig)
    )
  }

  const handleSelectCommunity = (community: Community) => {
    apply(community.page_content)
  }

  const handleSelectUser = async (user: UserSummary) => {
    // The directory carries names, not pages: fetching the page on selection
    // is one request, and it is the same one the link on the row would make.
    const loading = toast.loading(`Loading ${user.name}'s page…`)
    try {
      const page = await fetchUserPage(user.slug)
      apply(page.page_content)
      toast.dismiss(loading)
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "Could not load that page. Try another one."),
        { id: loading }
      )
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setInput("")
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Use as template</DialogTitle>
          <DialogDescription>
            Copy an existing page design into this one.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          {SOURCES.map((entry) => (
            <ToggleChip
              key={entry.id}
              label={entry.label}
              isActive={source === entry.id}
              onClick={() => {
                setSource(entry.id)
              }}
            />
          ))}
        </div>

        <InputGroup className="shadow-none!">
          <InputGroupAddon>
            <SearchIcon className="size-4 shrink-0 opacity-50" />
          </InputGroupAddon>
          <InputGroupInput
            ref={searchRef}
            placeholder={
              source === "people" ? "Search people…" : "Search communities…"
            }
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </InputGroup>

        <div className="scroll-thin max-h-72 overflow-y-auto">
          {source === "communities" ? (
            <InfiniteList
              items={communities.items}
              getKey={(community) => community.id}
              renderItem={(community) => {
                const avatar = selectMedia(community.media, "profile")?.url
                const design = hasContent(community.page_content)
                return (
                  <button
                    type="button"
                    disabled={!design}
                    onClick={() => handleSelectCommunity(community)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm outline-hidden hover:bg-muted data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50"
                  >
                    <ResilientImage
                      src={avatar}
                      alt=""
                      eager
                      containerClassName="size-8 shrink-0 rounded-full"
                      fallback={
                        <span className="grid size-full place-items-center rounded-full bg-community/15 text-xs font-semibold text-community">
                          {community.name.charAt(0).toUpperCase()}
                        </span>
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-medium">
                          {community.name}
                        </span>
                        {community.verified && (
                          <BadgeCheckIcon
                            className="size-3.5 shrink-0 text-primary"
                            aria-label="Verified community"
                          />
                        )}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        /{community.slug}
                      </span>
                    </span>
                    {!design && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        No design
                      </span>
                    )}
                  </button>
                )
              }}
              isPending={communities.isPending}
              isError={communities.isError}
              error={communities.error}
              refetch={() => {
                void communities.refetch()
              }}
              hasNextPage={communities.hasNextPage}
              isFetchingNextPage={communities.isFetchingNextPage}
              fetchNextPage={() => {
                void communities.fetchNextPage()
              }}
              empty={
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {keyword ? "No communities found" : "Start typing to search"}
                </p>
              }
            />
          ) : (
            <InfiniteList
              items={people.items}
              getKey={(user) => user.sub}
              renderItem={(user) => (
                <button
                  type="button"
                  disabled={!user.has_design}
                  onClick={() => {
                    void handleSelectUser(user)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm outline-hidden hover:bg-muted data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50"
                >
                  <ResilientImage
                    src={user.picture}
                    alt=""
                    eager
                    containerClassName="size-8 shrink-0 rounded-full"
                    fallback={
                      <span className="grid size-full place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {user.name} {user.surname}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      /u/{user.slug}
                    </span>
                  </span>
                  {!user.has_design && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      No design
                    </span>
                  )}
                </button>
              )}
              isPending={people.isPending}
              isError={people.isError}
              error={people.error}
              refetch={() => {
                void people.refetch()
              }}
              hasNextPage={people.hasNextPage}
              isFetchingNextPage={people.isFetchingNextPage}
              fetchNextPage={() => {
                void people.fetchNextPage()
              }}
              empty={
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {keyword ? "No people found" : "Start typing to search"}
                </p>
              }
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
