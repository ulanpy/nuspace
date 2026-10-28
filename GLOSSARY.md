# Glossary

Domain terms for Nuspace. When naming concepts in code, issues, or specs, use these terms.

| Term | Definition |
|------|------------|
| **NU** | Nazarbayev University. The institution this app serves. |
| **Nuspace** | The NU student superapp — campus services, announcements, and student essentials in one platform. |
| **Page** | A user- or org-authored page, edited with Puck and rendered from blocks. Stored in the `pages` table, addressed by slug at `pages.nuspace.kz/p/<slug>`, with a visibility tier and a list of admins. A **profile page** is a Page whose identity is the person: one per user, carried on `users` rather than the `pages` table, read at `my.nuspace.kz/u/$handle`. A lowercase `page` — in a DataTable's URL state, a result pager, or the workbench — is not a Page. |
| **Route screen** | A route's top-level UI component, rendered inside the app shell. Lives in `components/routes/<route>/` and is exported as `Page` — inherited convention, not a Page. A draft of one in the workbench's `route-screens/` is a workbench file, not a route screen. |
| **Visibility** | One axis, three tiers: `private` / `internal` / `public`. The middle tier is `internal` because that is the name the code and the API use; the picker labels it "Members only". Discoverability is not a separate flag — listing derives from it, so "listed where you cannot open it" is unrepresentable. |
| **Member** | A signed-in person who is not banned. Members read `internal` ("Members only") records; a guest is anyone not signed in. Signing in makes you a member only because the production sign-in admits NU Google accounts alone (ADR 0011). |
| **Overview** | The AI-written paragraph that summarises what a search found, shown above the results. It is present only for a signed-in viewer, and absent whenever fewer than three Sources were found or the model has nothing to add. It is a reading aid, never an authority. |
| **Source** | One record the Overview read: a Page, a channel message, a course, an event, an opportunity, a profile. Also what a search result is — one result is one Source. |
| **Citation** | A mark in the Overview's text pointing at the Source it came from. It is an index into the Sources the Overview was given, never a typed link. |
| **Abstention** | The Overview declining to answer, for want of Sources or for want of anything in them worth saying. The results list is then the whole answer, and no Overview renders. |
| **Route table** | The host→route table in `web/src/lib/hosts/constants.ts`: which of the six hosts serves which path. It generates the nginx include, the 404 pages and each host's `index.html`, and CI fails when it and the route tree disagree. A host's **mount** is the router path its routes live under (`events.nuspace.kz/42` is the router's `/events/42`). |
| **Lib module** | A bounded capability in `src/lib/<module>/` — constants, functions, types, tests. The unit of business logic. |
| **Route mirror** | The `components/routes/<route>/` folder holding a route screen and its subcomponents. UI only, no logic. |
| **DataTable** | The reusable table box (`shared/data-table/`), configured by `useDataTable`. Server-side pagination and sorting. |
| **WIF** | Workload Identity Federation. GitHub Actions authenticates to GCP via OIDC, no static keys. |
| **IAP** | Identity-Aware Proxy. GCP's TCP tunneling for private VM access (SSH, RDP) without public exposure. |
| **Presigned upload** | The three-step media flow: client requests a signed URL from the API, uploads directly to GCS, confirms. Bytes never pass through our API. |
| **Shadcn/ui** | Vendor-owned UI primitives in `components/ui/`. Consume, don't extend with project-specific props. |
| **UI workbench** | The dev-only Vite app at `web/ui-workbench/` for viewing design tokens and drafting components and screens. Runs on its own and is never part of the application build. |
| **Token override** | A token value edited in the workbench. Held above the router, so it stays applied across entries, and discarded on reload. |
| **Workbench file** | A `*.wb.tsx` file in the workbench's `components/` or `route-screens/`, discovered and mounted by its default export. The suffix is the convention. Scratch: work leaves by being written fresh in the app. |
| **Demo file** | A sibling `*.wb.demo.tsx` holding a workbench file's fixtures. Never an entry, and deleted when the component is written for real. |
