# PROGRESS — Standardize page layout & primitives

**Status:** done — all six phases landed and the standard is documented in `CONVENTIONS.md`
**Scope:** `web/src` only. No backend, no infra, no API changes.

This file is a self-contained brief. An agent picking this up cold should not
need any of the conversation that produced it.

---

## How to use this file

1. Read `web/CONVENTIONS.md` in full before touching anything. It is binding.
2. Read the "Decisions locked" section below. They are settled — do not
   re-litigate them, and do not substitute your own.
3. Work the phases top to bottom. Each phase leaves the tree green.
4. **Tick a checkbox `[x]` the moment that item is done and verified.** Not
   when you start it.
5. Before resuming after a break, run the verification command in
   "Resume protocol" and then `git diff` to see what actually landed.
6. If reality forces a change to this plan, edit this file in the same commit
   and note it under "Deviations" at the bottom. Do not silently diverge.

**Commands** (run from `web/`):

```sh
pnpm typecheck
pnpm test
pnpm lint
pnpm build        # also regenerates routeTree.gen.ts — required after any move
pnpm format
```

All five must be green before you call any phase done.

---

## The problem

Layout and page primitives were built page by page, so every screen became its
own kingdom. Specifically:

- **Two nested containers.** `layouts/app/index.tsx` wraps every route in a
  `PageContainer` that owns padding; then each page opens a _second_
  `PageContainer` that owns only the width cap. Pages that forget
  `padding="none"` (about, legal, landing) get the padding twice.
- **Widths were picked ad hoc per page**: 32rem, 48rem, 64rem, 80rem, 90rem.
- **Headers** share `PageHeader` but the action button is three different
  things, and the gap below the header is `space-y-6` / `space-y-8` /
  `space-y-12` depending on the page.
- **Filters have seven designs** (see "Current filter zoo" below).
- **Tabs** are a hand-rolled pill `<nav>`; the shadcn `ui/tabs.tsx` primitive
  exists and has zero usages.
- Several one-off primitives survive on a single page.

---

## Decisions locked

These were decided with the user. Change them only if asked.

| #   | Decision                                                                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Exactly two body widths**: `wide` (uncapped) and `prose` (`max-w-3xl`). No middle tier.                                                                                                     |
| 2   | The page box is **always** `max-w-7xl`. The `wide`/`prose` choice caps the **body only**, not the box.                                                                                        |
| 3   | **The title spans the page's own column.** On a `wide` page that is the full 80rem box; on a `prose` page it is the centred 3xl column, so the title never hangs to the left of its own text. |
| 4   | Page-header action buttons are **default size everywhere**. `Button`'s default is `h-8`, which matches `TabsList`'s `h-8`, so header and tab bar line up.                                     |
| 5   | `MultiFilter` **stays in shared** and is rebased on `ui/checkbox`.                                                                                                                            |
| 6   | `degree-audit-info` gets a **layout fix only** — do not merge it into `LegalPage`, do not reshape its data.                                                                                   |
| 7   | Community detail (`/communities/$slug`) and the page editor keep **bypassing the app shell entirely**. Their full-bleed canvas is deliberate. Leave them alone.                               |
| 8   | `ui/` is vendor code per CONVENTIONS. Consume it; never add project props or hand-written styles to a file in `ui/`. Anything recurring that shadcn doesn't ship goes in `shared/`.           |

---

## Target architecture

```
AppLayout
└── <div className="px-3 py-4 sm:px-4 sm:py-6 lg:px-6">   padding only
    └── Page  maxWidth="wide"                              always max-w-7xl
        ├── <PageHeader …/>                                full 80rem
        └── <div className="mt-6 [max-w-3xl]">{children}</div>   body: wide | prose
```

- Padding lives in exactly one place: the app shell.
- Width lives in exactly one place: the `Page` box.
- The rhythm between header and body lives in exactly one place: `Page`.
- `PageContainer`, `PagePadding`, `PageWidth` as _page_ types all go away.
- A page cannot accidentally get double padding, because it never sets padding.

A `prose` page **centres** its column (header included); a `wide` page's body
fills the box. This supersedes the original decision #3, which pinned the title
to the full box on every page: capping the text without centring it left prose
pages hugging the left edge of an 80rem box with a void beside them.

### Width assignment (do not reassign without asking)

| `wide` (body uncapped)                                                  | `prose` (body `max-w-3xl`)                                     |
| ----------------------------------------------------------------------- | -------------------------------------------------------------- |
| `/events`                                                               | `/opportunities`                                               |
| `/communities`                                                          | `/contacts`                                                    |
| `/announcements`                                                        | `/profile`                                                     |
| `/courses` + `/courses/statistics` `/courses/schedule` `/courses/audit` | `/communities/$slug/settings` + `/general` + `/admin-controls` |
| `/events/$eventId`                                                      | `/sgotinish`                                                   |
| `/about` (public)                                                       | `/degree-audit-info`                                           |
| `/` landing (public)                                                    | `/privacy-policy`, `/terms-of-service` (public)                |

Untouched: `/communities/$slug` detail, `/communities/$slug/editor`.

---

## Current filter zoo (the thing being unified)

| Where                              | Today                                                                                                          | Becomes                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| events                             | `FilterBar` box → `ButtonGroup` of `variant`-switched `Button`s, plus a stray toggle `Button`                  | bare flex row → `FilterTabs` (time) + `ui/toggle` (recruitment)                 |
| communities                        | `FilterBar` → `SearchFilter` + 2× `ChoiceChips`                                                                | bare flex row → `SearchFilter` + 2× `FilterTabs` (with "All")                   |
| opportunities                      | `FilterBar` → `SearchFilter` + 4× `MultiFilter` (raw `<input type="checkbox">`) + `variant="secondary"` Button | bare flex row → `SearchFilter` + 4× `MultiFilter` (`ui/checkbox`) + `ui/toggle` |
| contacts                           | `FilterBar` → `SearchFilter`                                                                                   | bare flex row → `SearchFilter`                                                  |
| `/courses/statistics`              | hand-rolled `fieldset` with `chipClass` **copy-pasted inline**                                                 | `FilterTabs`                                                                    |
| `/courses/audit`, opportunity form | `ToggleChip` groups (multi-select)                                                                             | **unchanged** — correct already                                                 |
| every filter input                 | `SearchFilter` hand-rolls an absolutely-positioned `SearchIcon` + `pl-9`                                       | `ui/input-group` (`InputGroup` + `InputGroupAddon` + `InputGroupInput`)         |

---

## The two new shared components

### 1. `shared/route-tabs.tsx` → `RouteTabs`

Replaces `shared/tabs-nav.tsx`. Route-driven section tabs, built on
`ui/tabs` + TanStack `Link`.

```tsx
export interface RouteTab {
  to: LinkProps["to"]
  label: string
  /** Index route needs exact matching or it stays lit on every child. */
  exact?: boolean
}

export function RouteTabs({
  label,
  tabs,
  className,
}: {
  label: string
  tabs: readonly RouteTab[]
  className?: string
})
```

Mechanics:

- `Tabs value={activeTabValue} onValueChange={(v) => navigate({ to: v })}`
  where `v` is the tab's `to`. Keep the `Link` in `render` so the href is
  real (middle-click, copy link, prefetch).
- Base UI renders `Tabs.Tab` as a `<button>`; pass
  `nativeButton={false} render={<Link to=… />}` to get an anchor.
- Active value from `useMatchRoute()` per tab, same fuzzy/exact logic as
  today's `TabsNav`.
- Keep `label` → `aria-label` on the list.

Rationale that must survive into a JSDoc comment: tabs are real child routes,
not `useState`, so each section stays linkable, back-button-able and
separately code-split. `/courses/schedule` and `/courses/audit` are the two
heaviest screens in the app.

### 2. `shared/list-filters.tsx` → `FilterTabs`

Same `ui/tabs` primitives, but local/controlled state, no panels.

```tsx
export function FilterTabs<T extends string>({
  label,
  value,          // T | undefined
  options,        // readonly FilterOption<T>[]
  showAll,        // default true; renders an "All" chip that maps to undefined
  onChange,       // (value: T | undefined) => void
}: { … })
```

Mechanics:

- `ui/tabs` `Tabs` + `TabsList` + `TabsTrigger`, plain button triggers
  (no `render`), controlled via `value` / `onValueChange`.
- Base UI requires a non-null `value` on a Tab, so `undefined` is mapped to an
  internal sentinel (e.g. `"__all__"`) for the "All" chip and back out in
  `onValueChange`. Keep the sentinel private to this file.
- `label` → `<legend className="sr-only">`-equivalent: the existing
  `ChoiceChips` wrapped chips in a `fieldset` + `sr-only` `legend`. Preserve
  that accessible name.

This file keeps `SearchFilter` and `MultiFilter`, and **loses** `FilterBar`
and `ChoiceChips` (see Deletions).

---

## Phases

### Phase 1 — primitives

- [x] 1.1 Create `shared/route-tabs.tsx` with `RouteTabs` (see above).
- [x] 1.2 Create `shared/page/index.tsx` with the `Page` primitive:
      props `title`, `description?`, `eyebrow?`, `actions?`,
      `width?: "wide" | "prose"` (default `"wide"`), `className?`, `children`.
      Renders `mx-auto w-full max-w-7xl` → `PageHeader` → body
      `<div className="mt-6">` + `max-w-3xl` when `width === "prose"`.
      Add a JSDoc explaining _why_ the box is always 7xl and only the body
      is capped (decision #2/#3), so it does not get "fixed" back.
- [x] 1.3 Add `FilterTabs` to `shared/list-filters.tsx`.
- [x] 1.4 Rebase `SearchFilter` on `ui/input-group`; delete the manual
      `SearchIcon` + `pl-9`. Preserve the `label` → `aria-label` behaviour
      added in c8b4b6f (the placeholder is a content hint, not a label).
- [x] 1.5 Rebase `MultiFilter`'s checkboxes on `ui/checkbox`.
- [x] 1.6 `ui/tabs` is vendor code — do **not** edit it. If a project-specific
      style is needed, pass `className` from `shared/`.
- [x] 1.7 Verify: `pnpm typecheck && pnpm lint && pnpm build`

### Phase 2 — layouts

- [x] 2.1 `layouts/app/index.tsx`: replace the `PageContainer maxWidth="full"`
      with a plain `<div className="px-3 py-4 sm:px-4 sm:py-6 lg:px-6">`
      (keep the `className` that encodes the padding, drop the import).
- [x] 2.2 `layouts/courses/index.tsx`: `PageContainer`+`PageHeader` → `Page`,
      `TabsNav` → `RouteTabs`. Keep the TABS const and its JSDoc.
- [x] 2.3 `layouts/settings/index.tsx`: same swap in `SettingsShell`.
      Keep the `sections` prop (2 consumers — it earns its place) and keep
      `SettingsShell` vs `SettingsLayout` split (documented in its JSDoc:
      profile is a leaf route with no `Outlet`).
- [x] 2.4 Verify: `pnpm typecheck && pnpm lint && pnpm build`

### Phase 3 — app routes (the visible work)

Do these in order. Each is independent; tick as you go.

- [x] 3.1 **`routes/events`** — `Page`; `FilterBar` → bare
      `flex flex-wrap items-center gap-2`; `ButtonGroup` → `FilterTabs`;
      "Club Recruitments" → `ui/toggle` (drop the
      `cn(type !== "recruitment" && "bg-background")` variant-fight);
      delete the local `EventGridSkeleton` (see 5.6).
- [x] 3.2 **`routes/communities`** — `Page`; `FilterBar` → bare flex row;
      2× `ChoiceChips` → 2× `FilterTabs`; `CardGridSkeleton` stays.
- [x] 3.3 **`routes/opportunities`** — `Page width="prose"`; `FilterBar` →
      bare flex row; "Hide expired" `variant="secondary"` → `ui/toggle`.
- [x] 3.4 **`routes/contacts`** — `Page width="prose"`; drop
      `eyebrow="Campus directory"`; `FilterBar` → bare flex row;
      `Section spacing="none"` → plain `<section>`;
      `CardGrid columns={2}` **unchanged** (48rem body wants 2 columns).
- [x] 3.5 **`routes/announcements`** — `Page`; `space-y-8` → the standard
      body gap.
- [x] 3.6 **`routes/profile`** — comes free via `SettingsShell`; separately
      replace the hand-rolled `Row` + `divide-y divide-border` with
      `ui/item` (`ItemGroup` / `Item` / `ItemContent` / `ItemTitle` /
      `ItemDescription` / `ItemActions`). Drop the separators.
- [x] 3.7 **`routes/communities/settings/general`** and
      **`…/admin-controls`** — inherit the new shell; drop their own
      `space-y-10` wrappers so the shell's rhythm governs.
- [x] 3.8 **`routes/sgotinish`** — replace raw `mx-auto max-w-lg` div with
      `Page width="prose"`. Keep the `eyebrow="Student Government"` (it
      carries real meaning, unlike "Campus directory").
- [x] 3.9 **`routes/degree-audit-info`** — replace raw
      `<article className="mx-auto max-w-prose …">` with `Page width="prose"`.
      Layout only (decision #6): keep the byline, the disclaimer block, the
      hand-rolled content. It is a sibling of the courses tabs, not a fifth tab.
- [x] 3.10 **`routes/events/$eventId`** — replace raw
      `mx-auto max-w-[90rem]` with `Page width="wide"`. It is currently the
      widest page in the app; this is a bug, not a design.
- [x] 3.11 **`routes/courses/statistics`** — replace the inline
      `chipClass` copy-paste with `FilterTabs`. (`/courses/index`,
      `/schedule`, `/audit` need no change — they render inside
      `CoursesLayout`.)
- [x] 3.12 Verify: `pnpm typecheck && pnpm test && pnpm lint && pnpm build`

### Phase 4 — public routes

- [x] 4.1 **`shared/legal/legal-page.tsx`** — `PageContainer` →
      `Page width="prose"`; the two `Section spacing="none"` → `<section>`.
- [x] 4.2 **`routes/about`** — `Page` (this is what removes the doubled
      padding). Keep the centred header via `PageHeader`'s `className`
      escape hatch; it is the only app page that uses it besides landing.
- [x] 4.3 **`routes/landing`** — swap the four `PageContainer`s for `Page`
      where it is a plain section, keep the per-section `py-*`. It is the only
      real user of large section spacing. Drop its `space-y-*` overrides that
      now duplicate the standard.
- [x] 4.4 Verify: `pnpm typecheck && pnpm lint && pnpm build`

### Phase 5 — deletions

Only after every consumer is migrated. Grep before each delete.

- [x] 5.1 `shared/page/section.tsx` — **delete.** All 8 call sites pass
      `spacing="none"`, i.e. a no-op `<section>`. The one `spacing="default"`
      user (landing) overrides it with its own `py-*`, so both sets of classes
      end up in the same class list and Tailwind's cascade order, not source
      order, decides the winner. That is the bug this removes.
- [x] 5.2 `shared/page/container.tsx` — **delete.** Width classes moved into
      `Page`; padding moved to the shell. `PagePadding`'s `dense` branch had
      zero call sites and `none` existed only to undo the shell.
- [x] 5.3 `shared/tabs-nav.tsx` — **delete**, replaced by `route-tabs.tsx`.
- [x] 5.4 In `shared/list-filters.tsx` — **delete `FilterBar` and
      `ChoiceChips`.** `FilterBar` is the "unnecessary container" the user
      called out; `ChoiceChips` had one consumer.
- [x] 5.5 In `shared/toggle-chip.tsx` — make `chipClass` private. After
      `ChoiceChips` is gone it has no external consumer. `ToggleChip` itself
      stays: two pages use it (degree audit, opportunity form).
- [x] 5.6 In `shared/page/card-grid.tsx` — add a `banner` variant to
      `CardGridSkeleton` (the `aspect-3/4 rounded-none p-0` shape events
      needs) and delete events' private `EventGridSkeleton`. One skeleton
      primitive, two pages — this is what gets it over the two-page bar.
- [x] 5.7 `shared/settings/settings-section.tsx` — **delete the `width`
      prop** and its `widthClasses`. `prose` had zero call sites; `form` and
      `full` are the cause of the ragged-left settings pages. Page-level
      width governs now.
- [x] 5.8 Collapse `CommunityNotFound` (`routes/communities/$slug/index.tsx`)
      into `shared/not-found.tsx`; keep the shared one used by
      `app/router.tsx`.
- [x] 5.9 Verify: `pnpm typecheck && pnpm test && pnpm lint && pnpm build`

### Phase 6 — document the standard

The drift happened because nothing said what the standard _was_. This phase is
what stops it recurring — do not skip it.

- [x] 6.1 Add a **Page layout** section to `web/CONVENTIONS.md`: the
      always-7xl box, the two body widths, header spans the box, the width
      assignment table above, and the rule that a page never sets padding.
- [x] 6.2 Update the `shared/` directory-roles list: `page/` is now
      `page` + `header` + `card-grid` (container and section are gone);
      `route-tabs` joins the flat shared primitives; `tabs-nav` is removed.
- [x] 6.3 Note the `ui/` rule explicitly where it matters: recurring styled
      behaviour shadcn does not ship belongs in `shared/`, never upstreamed
      into `ui/`.
- [x] 6.4 Final: `pnpm typecheck && pnpm test && pnpm lint && pnpm format && pnpm build`
- [x] 6.5 Commit. Suggested message:
      `refactor(web): standardize page layout, tabs and filter primitives`

---

## Not in scope

Do not touch these. They were considered and explicitly deferred.

- Merging `degree-audit-info` into `LegalPage` (needs a data reshape — a
  content refactor, not a layout one).
- The community detail landing page and the Puck editor. They bypass the shell
  on purpose.
- `MultiFilter` moving under `routes/opportunities/` — it stays shared.
- Any backend, API schema, or `api:generate` change.
- `SettingsSection`'s "uncontainered" design (heading owns itself, caller
  chooses `Card` / bare / danger zone). It is deliberate; only the `width`
  prop goes.

---

## Final self-check

Before declaring done, confirm all of these:

- [x] No page sets horizontal padding. Only `layouts/app` and `layouts/public` do.
- [x] Every page is a `Page`. The only exceptions are community detail and the
      editor (decision #7).
- [x] Exactly two width values exist in the app: `max-w-7xl` (the box) and
      `max-w-3xl` (the `prose` body).
- [x] No raw `mx-auto max-w-*` in any route page. `grep` for it.
- [x] No `FilterBar`, no bordered filter box, anywhere.
- [x] `ui/tabs`, `ui/toggle`, `ui/item`, `ui/checkbox` are all in use.
- [x] `shared/tabs-nav.tsx` and `shared/page/section.tsx` are gone.
- [x] `grep -rn "chipClass" src` returns only `shared/toggle-chip.tsx`.
- [x] Every page-header action button is default size.
- [x] "Campus directory" and the profile `divide-y` separators are gone.
- [x] `CONVENTIONS.md` documents the standard.

---

## Resume protocol

1. `cd web && pnpm typecheck && pnpm lint` — confirm the tree is green.
2. `git diff` + `git status` — see what actually landed.
3. `grep -n "^- \[ \]" PROGRESS.md | head -1` — the first unticked box is
   where you resume.
4. Read the phase header for context, do the item, tick it, run that phase's
   verify command.

## Deviations

- **`pnpm lint` is red before this work starts.** `layouts/app/app-sidebar.tsx:293`
  trips `jsx-a11y/no-noninteractive-element-interactions` and
  `jsx-a11y(click-events-have-key-events)` on the deliberate click-to-expand
  collapsed rail. Pre-existing on `f0b8acb`, unrelated to layout. The bar used
  here is "no _new_ findings from the files this plan touches" rather than a
  green lint run. Verified by diffing the full finding list before and after each
  phase; the count went 9 → 8, the one that went being the `max-w-[90rem]` on
  `/events/$eventId` that 3.10 removed. Also pre-existing and untouched:
  `Date.now()` during render in `routes/announcements`, and four
  `text-sm leading-relaxed` class-order nits in `routes/events/$eventId`.

- **The landing page's bands are no longer full-bleed.** `layouts/public` now
  owns the same gutter as the app shell, so `/`'s bordered sections sit inset by
  1.5rem instead of running edge to edge, and the hero box grew from the old
  `max-w-5xl` to the standard `max-w-7xl`. Both follow from decisions #2 and
  "a page never sets padding"; the alternative was a negative-margin escape
  hatch that re-couples the page to the shell's breakpoints. Revisit only if
  someone says the bands should be full-bleed again.

- **`Page`'s `title` is optional.** 4.3 needed a box with no header for the
  landing hero and its last two sections. Rather than give `Page` a
  `headerClassName`-style escape hatch or fake a title, the header is skipped
  when there is nothing to put in it and the `mt-6` comes with it.

- **`PageHeader` lost its inner `max-w-3xl`.** The h1 element spanned the box
  but wrapped at 3xl, so a long title was narrower than the list below it.

- **`prose` pages now centre, and the title centres with them** (asked for after
  the work landed). Two `mx-auto max-w-3xl`s in `Page`, one on the body and one
  passed to `PageHeader` as its class, so the header stays the full box on a
  `wide` page. Centring the body alone was rejected: the title would then start
  ~16rem left of the text under it. No page opted in individually — it is keyed
  off `width`, so all nine prose pages moved together, `/profile` included
  through `SettingsShell`.

- **The community 404 lost its `Card`.** 5.8 collapsed it into
  `shared/not-found.tsx`, which is uncontained and `min-h-screen`. The two were
  near-identical and the Card was decoration; the copy (title, body, destination)
  is now props. `app/router.tsx` passes no props and keeps its old look.
