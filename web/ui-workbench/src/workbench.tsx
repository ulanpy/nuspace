/**
 * The workbench shell. Portable: it imports shadcn primitives and the host
 * project's tokens, and discovers whatever sits in `components/` and `pages/`.
 * See README.md for the files to edit when dropping it into a project.
 *
 * The shell owns the two pieces of state every surface needs: what has been typed
 * into a token, and which token is in the editor. The token sheet and a
 * component's token panel are two views onto that state, which is why an edit
 * made on one is still there on the other.
 */
import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type CSSProperties,
} from "react"

import { Download, Moon, PanelLeft, RotateCcw, Sun } from "lucide-react"

import workbench from "../ui-workbench.config"

import { keyOf, parseTokens, unkey, type Token } from "./tokens"
import {
  downloadPlan,
  SPECIMEN_STYLE,
  TokenSheet,
  UsedByPanel,
  useIsDark,
  useSheet,
} from "./token-sheet"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar"

type Module = { default: ComponentType }
type Entry = { name: string; path: string; load: () => Promise<Module> }

/**
 * One width for the rail, written on the provider rather than left to shadcn's
 * default so it cannot change under the workbench.
 */
const SIDEBAR: CSSProperties & Record<`--${string}`, string> = {
  "--sidebar-width": "16rem",
  "--sidebar-width-mobile": "16rem",
}

/**
 * The `.wb` suffix is the whole convention: it is what a file must be called to
 * be an entry. Fixtures live in `.wb.demo.tsx`, which the glob does not match,
 * so nothing has to filter them out afterwards.
 */
function entries(glob: Record<string, () => Promise<Module>>): Entry[] {
  return Object.entries(glob)
    .map(([path, load]) => ({
      name:
        path
          .split("/")
          .at(-1)
          ?.replace(/\.wb\.tsx$/, "") ?? path,
      path,
      load,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

const COMPONENTS = entries(import.meta.glob<Module>("../components/*.wb.tsx"))
const PAGES = entries(import.meta.glob<Module>("../pages/*.wb.tsx"))

const GROUPS = [
  { label: "Pages", entries: PAGES },
  { label: "Components", entries: COMPONENTS },
]

/** `?c=` picks an entry. */
type Params = { entry: string | null }

const readParams = (): Params => ({
  entry: new URLSearchParams(location.search).get("c"),
})

function useParams() {
  const [params, setParams] = useState(readParams)

  useEffect(() => {
    const onPop = () => setParams(readParams())
    addEventListener("popstate", onPop)
    return () => removeEventListener("popstate", onPop)
  }, [])

  const write = (next: Params) => {
    const url = new URL(location.href)
    url.searchParams.delete("c")
    if (next.entry) url.searchParams.set("c", next.entry)
    history.pushState(null, "", url)
    setParams(next)
  }

  return [params, write] as const
}

/**
 * Every override as one stylesheet, in the same syntax as the source file, so
 * the theme toggle keeps working and the download is this text applied to the
 * original. Mounted above the router, so an edit follows you onto a page.
 */
function OverrideStyle({ overrides }: { overrides: Map<string, string> }) {
  const css = useMemo(() => {
    const byBlock = new Map<string, string[]>()

    for (const [key, value] of overrides) {
      const { block, name } = unkey(key)

      // An at-rule such as `@theme` is not a selector. Tailwind emits those
      // variables on `:root`, and that is where an override has to land to be
      // seen.
      const selector = block.startsWith("@") ? ":root" : block
      const declarations = byBlock.get(selector) ?? []
      declarations.push(`${name}: ${value}`)
      byBlock.set(selector, declarations)
    }

    return [...byBlock]
      .map(
        ([selector, declarations]) =>
          `${selector} { ${declarations.join("; ")}; }`
      )
      .join("\n")
  }, [overrides])

  return <style>{css}</style>
}

function Loaded({ load }: { load: Entry["load"] }) {
  const [Component, setComponent] = useState<ComponentType | null>(null)

  useEffect(() => {
    let live = true
    void load().then((module) => {
      if (live) setComponent(() => module.default)
    })
    return () => {
      live = false
    }
  }, [load])

  return Component ? (
    <Component />
  ) : (
    <p className="text-sm text-muted-foreground">Loading…</p>
  )
}

/**
 * The host project's theme provider is not mounted here, so this works on the
 * root class directly. It does not persist: the app's own key is not ours to
 * write, and a reload only costs one toggle.
 */
function ThemeToggle() {
  const dark = useIsDark()

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
      onClick={() =>
        document.documentElement.classList.toggle(workbench.darkClass)
      }
    >
      {dark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  )
}

function download(css: string) {
  const blob = new Blob([css], { type: "text/css" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "index.css"
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * The bar across the top: which entry is open, what is unsaved, and the three
 * controls. It sits inside the sidebar's provider, so its toggle asks the
 * provider rather than keeping its own flag. Below `md` the sidebar is a sheet
 * that the provider opens, so both states are read from the same place.
 *
 * The labels go on a phone, where this row is the whole header and five words do
 * not fit beside the toggles. Every one of them keeps its aria-label.
 */
function Header({
  title,
  unsaved,
  retyped,
  css,
  onDiscard,
}: {
  title: string
  unsaved: number
  /** A type picked in this session writes nothing, and still has to be discardable. */
  retyped: number
  css: string
  onDiscard: () => void
}) {
  const { toggleSidebar, open, openMobile, isMobile } = useSidebar()

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 [--wb-header:3.5rem] sm:px-4">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Toggle the component list"
        aria-expanded={isMobile ? openMobile : open}
        onClick={toggleSidebar}
      >
        <PanelLeft aria-hidden />
      </Button>
      <h1 className="truncate font-heading text-lg font-medium">{title}</h1>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <Button
          size="sm"
          variant="outline"
          aria-label="Discard every change"
          disabled={unsaved === 0 && retyped === 0}
          onClick={onDiscard}
        >
          <RotateCcw aria-hidden />
          <span className="hidden sm:inline">Reset</span>
        </Button>
        <Button
          size="sm"
          // The one control allowed to give up width, because a header that paints
          // over what is beside it is worse than a count one word short.
          className="min-w-0 shrink"
          aria-label={`Download ${unsaved} change${unsaved === 1 ? "" : "s"}`}
          disabled={unsaved === 0}
          onClick={() => download(css)}
        >
          <Download aria-hidden />
          <span className="hidden sm:inline">Download</span>
          <span className="truncate tabular-nums">
            {unsaved || "no"} change{unsaved === 1 ? "" : "s"}
          </span>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  )
}

/**
 * The list of entries. Inside the provider, because below `md` the rail is a sheet
 * over the page and choosing an entry has to put it away: the sheet would sit on
 * top of the thing it just navigated to.
 */
function SidebarNav({
  entry,
  onPick,
}: {
  entry: string | null
  onPick: (entry: string | null) => void
}) {
  const { setOpenMobile } = useSidebar()

  const pick = (name: string | null) => () => {
    onPick(name)
    setOpenMobile(false)
  }

  return (
    <>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton isActive={!entry} onClick={pick(null)}>
              Tokens
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.entries.map((candidate) => (
                  <SidebarMenuItem key={candidate.name}>
                    <SidebarMenuButton
                      isActive={entry === candidate.name}
                      onClick={pick(candidate.name)}
                    >
                      {candidate.name}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </>
  )
}

export function Workbench({ source }: { source: string }) {
  const tokens = useMemo(() => parseTokens(source), [source])
  const [params, navigate] = useParams()
  // Above the router, so an edit stays applied on whatever you navigate to.
  const [overrides, setOverrides] = useState<Map<string, string>>(new Map())
  const sheet = useSheet({ tokens, overrides })
  const plan = useMemo(
    () => downloadPlan(source, tokens, sheet),
    [source, tokens, sheet]
  )

  const entry = [...COMPONENTS, ...PAGES].find(
    (item) => item.name === params.entry
  )
  const isPage = PAGES.some((page) => page.name === params.entry)

  const edit = (token: Token, value: string) =>
    setOverrides((prev) => new Map(prev).set(keyOf(token), value))

  return (
    // Below 1280 the rail is closed on the first paint: open, it leaves a column
    // too thin to work in. After that it is the user's, and a resize never closes
    // it again.
    <SidebarProvider defaultOpen={window.innerWidth >= 1280} style={SIDEBAR}>
      <OverrideStyle overrides={overrides} />
      <style>{SPECIMEN_STYLE}</style>

      {/* `offcanvas` collapses to zero width and is fixed to the viewport, so the
          rail is full height however long the page gets. */}
      <Sidebar collapsible="offcanvas">
        <SidebarNav
          entry={params.entry}
          onPick={(name) => navigate({ entry: name })}
        />
      </Sidebar>

      {/* `min-w-0` so a window narrower than the rail cannot push the page wider
          than the window and scroll it sideways. */}
      <SidebarInset className="min-w-0">
        <Header
          title={entry ? entry.name : "Tokens"}
          unsaved={plan.edits}
          retyped={sheet.retyped}
          css={plan.css}
          onDiscard={() => {
            setOverrides(new Map())
            sheet.onReset()
          }}
        />

        {!params.entry ? (
          <div className="p-4 sm:p-6">
            <TokenSheet tokens={tokens} sheet={sheet} onEdit={edit} />
          </div>
        ) : entry ? (
          <UsedByPanel
            tokens={tokens}
            entry={entry.path}
            sheet={sheet}
            onEdit={edit}
            padded={!isPage}
          >
            <Loaded load={entry.load} />
          </UsedByPanel>
        ) : (
          <div className="p-4 sm:p-6">
            <h1 className="font-heading text-2xl font-medium">
              {params.entry}
            </h1>
            <p className="text-sm text-muted-foreground">
              No <code>{params.entry}.wb.tsx</code> in components or pages.
            </p>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}
