import { useEffect, useRef, useState } from "react"
import { BadgeCheckIcon, SearchIcon } from "lucide-react"

import type { Community } from "@/lib/communities"
import { qk } from "@/api/query-keys"
import { fetchCommunitiesPage } from "@/lib/communities"
import { selectMedia } from "@/lib/media/functions"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import { useDebounced } from "@/hooks/use-debounced"
import { InfiniteList } from "@/components/shared/query/infinite-list"
import { ResilientImage } from "@/components/shared/media/resilient-image"
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

function hasDesign(community: Community): boolean {
  const content = community.page_content?.content
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

  const list = useInfiniteList({
    enabled: open,
    queryKey: qk.communities.list(filters),
    fetchPage: (page) => fetchCommunitiesPage(filters, page),
  })

  const handleSelect = (community: Community) => {
    onOpenChange(false)
    setInput("")
    onApply(
      applyTemplate(
        community.page_content as Record<string, unknown>,
        pageEditorConfig
      )
    )
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
            Copy a community page design into this one.
          </DialogDescription>
        </DialogHeader>

        <InputGroup className="shadow-none!">
          <InputGroupAddon>
            <SearchIcon className="size-4 shrink-0 opacity-50" />
          </InputGroupAddon>
          <InputGroupInput
            ref={searchRef}
            placeholder="Search communities…"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </InputGroup>

        <div className="scroll-thin max-h-72 overflow-y-auto">
          <InfiniteList
            items={list.items}
            getKey={(community) => community.id}
            renderItem={(community) => {
              const avatar = selectMedia(community.media, "profile")?.url
              const design = hasDesign(community)
              return (
                <button
                  type="button"
                  disabled={!design}
                  onClick={() => handleSelect(community)}
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
            isPending={list.isPending}
            isError={list.isError}
            error={list.error}
            refetch={() => {
              void list.refetch()
            }}
            hasNextPage={list.hasNextPage}
            isFetchingNextPage={list.isFetchingNextPage}
            fetchNextPage={() => {
              void list.fetchNextPage()
            }}
            empty={
              <p className="py-6 text-center text-sm text-muted-foreground">
                {keyword ? "No communities found" : "Start typing to search"}
              </p>
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
