import { useEffect, useRef, useState } from "react"
import { SearchIcon } from "lucide-react"

import { qk } from "@/api/query-keys"
import { fetchPagesPage } from "@/lib/pages"
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

/** Puck writes an empty page with an empty content array and a root. */
function hasContent(pageContent: unknown): boolean {
  const content = (pageContent as { content?: unknown } | null)?.content
  return Array.isArray(content) && content.length > 0
}

/**
 * Copy an existing page's design into the one being edited.
 *
 * One list, not a tab per source. It used to offer People and Communities
 * separately, and the people tab carried its own `user.has_design` flag and a
 * `fetchUserPage` call on selection to fetch content it could have had already.
 * `ListPage` items carry `page_content`, so one list and one handler cover both:
 * there is no source left to choose between.
 *
 * Unfiltered by visibility, deliberately: a template is a design, and how widely
 * a page is published says nothing about that.
 */
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

  const pages = useInfiniteList({
    enabled: open,
    queryKey: qk.pages.list(filters),
    fetchPage: (page) => fetchPagesPage(filters, page),
  })

  const apply = (pageContent: unknown) => {
    onOpenChange(false)
    setInput("")
    onApply(
      applyTemplate(pageContent as Record<string, unknown>, pageEditorConfig)
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
            Copy an existing page design into this one.
          </DialogDescription>
        </DialogHeader>

        <InputGroup className="shadow-none!">
          <InputGroupAddon>
            <SearchIcon className="size-4 shrink-0 opacity-50" />
          </InputGroupAddon>
          <InputGroupInput
            ref={searchRef}
            placeholder="Search pages…"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </InputGroup>

        <div className="scroll-thin max-h-72 overflow-y-auto">
          <InfiniteList
            items={pages.items}
            getKey={(page) => page.id}
            renderItem={(page) => {
              const avatar = selectMedia(page.media, "profile")?.url
              const design = hasContent(page.page_content)
              return (
                <button
                  type="button"
                  disabled={!design}
                  onClick={() => {
                    apply(page.page_content)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm outline-hidden hover:bg-muted data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50"
                >
                  <ResilientImage
                    src={avatar}
                    alt=""
                    eager
                    containerClassName="size-8 shrink-0 rounded-full"
                    fallback={
                      <span className="grid size-full place-items-center rounded-full bg-page/15 text-xs font-semibold text-page">
                        {page.name.charAt(0).toUpperCase()}
                      </span>
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="truncate font-medium">{page.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      /p/{page.slug}
                    </span>
                  </span>
                  {!design ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      No design
                    </span>
                  ) : null}
                </button>
              )
            }}
            isPending={pages.isPending}
            isError={pages.isError}
            error={pages.error}
            refetch={() => {
              void pages.refetch()
            }}
            hasNextPage={pages.hasNextPage}
            isFetchingNextPage={pages.isFetchingNextPage}
            fetchNextPage={() => {
              void pages.fetchNextPage()
            }}
            empty={
              <p className="py-6 text-center text-sm text-muted-foreground">
                {keyword ? "No pages found" : "Start typing to search"}
              </p>
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
