# ADR 0004: Frontend Conventions

## Status

Accepted

## Context

The frontend needed consistent patterns for file organization, naming, and code style to remain navigable as the app grows.

## Decision

**Source layout:**
- `routes/` — TanStack Router file-based routes (thin, routing only)
- `components/routes/<route>/` — Page components and route-exclusive UI
- `components/layouts/` — App shells (app, courses, public)
- `components/shared/` — Cross-page reusable UI grouped by domain
- `components/ui/` — shadcn/ui primitives (vendor code, consume only)
- `lib/<module>/` — Bounded capabilities: constants, functions, types, tests
- `hooks/` — Reusable stateful behavior behind `use*` hooks
- `api/` — Generated OpenAPI types, client, query keys

**Naming:**
- Component and module files: `kebab-case`
- Compound components: folder with `index.tsx`
- Page-editor blocks: PascalCase folders
- Route segments: `$` prefix
- `_`-prefixed directories: private to parent

**Page layout:**
- Every page uses the `Page` component from `shared/page`
- Box is always `max-w-7xl`, two body widths: `wide` (uncapped) and `prose` (`max-w-3xl`)
- Pages never set padding — layouts own it

**Tables:**
- `DataTable` (box) + `useDataTable` (config) + `TablePagination` (footer)
- Page/size/sort/order are URL state, not component state
- Server-side: `manualPagination` and `manualSorting` on

**Design tokens:** Use `bg-muted`, `text-foreground`, `border-border` — never raw palette classes like `bg-gray-100`.

## Consequences

- Consistent file organization across all routes
- Predictable component patterns
- No drift in page layout
- Design tokens handle dark mode automatically

## Related

- GLOSSARY.md for domain terms
- ADR 0005 (frontend architecture)
