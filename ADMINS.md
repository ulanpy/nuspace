# Community Admins — Implementation Prompt

You are an AI coding agent working in the `nuspace` repo. Implement the
per-community admin feature described below, end to end (backend + frontend),
following the repo's existing conventions. This is a working document: **update
it as you go.**

---

## Progress tracking (MUST follow)

- **Before any other work**, read this file and the repo's `AGENTS.md`.
- Work through the checkboxes below **in order**, top to bottom. Mark a step
  `- [x]` only after its work is actually done and verified.
- Keep **exactly one step in progress** at a time: maintain the status block
  below and keep it accurate. When you start work, add a `<!-- in_progress -->`
  marker above the current step's checkbox and remove it when the step is done.
- If you are interrupted / run out of context, **stop cleanly**: leave a short
  note in the Status section ("Next: …"), commit nothing unless asked, and on
  the next session resume by reading this file and picking up at the first
  unfinished checkbox.
- Commit only when the user asks. Follow Conventional Commits.

### Status

```text
Branch:            (confirm against git before starting)
Backend models:    pending | in_progress | done
Migration:         pending | in_progress | done
Policy/permissions:pending | in_progress | done
Admin link API:    pending | in_progress | done
Frontend routes:   pending | in_progress | done
Settings page:     pending | in_progress | done
Verification:      pending | in_progress | done

Next:
```

---

## Context & conventions (read first — do not re-invent these)

- Backend: FastAPI + SQLAlchemy async + PostgreSQL + Alembic, module-per-boundary
  in `backend/modules/<name>/`. **`communities` live in the `campuscurrent`
  module** (`backend/modules/campuscurrent/communities/`), not a module of their
  own.
- Layering: `api.py → service.py → repository.py → DB`; no SQL in dependencies,
  no business logic in API. Commits at request boundary; repos only
  add/flush/refresh.
- Authorization: policy classes in service methods; `get_creds_or_401` for
  auth; `ResourcePermissions` for frontend permission hints. **Do not add new
  patterns.**
- Current `communities` columns: `id, name, type, category, email, verified,
  owner (str FK → users.sub), slug, page_content, created_at, updated_at`.
  There is **no** `description / established / telegram_url / instagram_url` and
  the owner column is `owner`, not `head`.
- Do NOT touch `/frontend` (dead legacy). The active frontend is `/web`
  (React + TS + TanStack Router/Query, shadcn/ui in `web/src/components/ui/`,
  icons from `lucide-react`). Only `/web` is relevant.
- Sanity-check column/model state against the code before coding — prior
  migrations may have moved things.
- Read `RBAC.md` for prior authorization work context.

---

## Preflight (do FIRST)

- [ ] Confirm working branch with `git branch --show-current` and record it in
      the Status block above.
- [ ] Re-read current models: `backend/modules/campuscurrent/models/community.py`,
      `backend/modules/campuscurrent/models/events.py` (for the
      `EventAccessInvite` / composite-PK patterns to mirror), and
      `backend/modules/auth/models.py`. Record the confirmed owner column name
      in the Status block if it differs from `owner`.
- [ ] Read `backend/modules/campuscurrent/communities/` (`api.py`, `service.py`,
      `repository.py`, `policy.py`, `schemas.py`, `utils.py`,
      `dependencies.py`), `backend/modules/campuscurrent/base.py`,
      `backend/common/schemas.py`, `backend/common/utils/enums.py`,
      `backend/core/database/model_registry.py`, and
      `backend/modules/auth/dependencies.py`.
- [ ] Read frontend: `web/src/routes/_app/communities/$slug/index.tsx`,
      `$slug.edit-details.tsx`, `$slug.edit-page.tsx`,
      `web/src/features/communities/api.ts`, `types.ts`, `query-keys.ts`,
      `web/src/features/auth/use-session.ts`, and list
      `web/src/components/ui/`.

---

## Backend — data model

- [ ] Add `CommunityAdmin` model in
      `backend/modules/campuscurrent/models/community.py`:
      - table `community_admins`
      - `community_id` BigInteger FK → `communities.id` ondelete CASCADE (indexed)
      - `user_sub` String FK → `users.sub` ondelete CASCADE (indexed)
      - `created_at` timestamptz default `utc_now`
      - composite primary key `(community_id, user_sub)` (prevents duplicates)
      - add a `community_admins` relationship on `Community` for eager loading
        (mirror the existing `owner_user` relationship).
- [ ] Add `CommunityAdminLink` model (mirror `EventAccessInvite` shape):
      - table `community_admin_links`
      - `id` BigInteger PK, `community_id` FK → `communities.id` CASCADE
        (indexed), `token_hash` String(64) unique+indexed, `created_by_sub`
        String FK → `users.sub`, `created_at`, `revoked_at` nullable
      - **no expiry** — valid until rotated
- [ ] Export both models from
      `backend/modules/campuscurrent/models/__init__.py`.

## Backend — migration

- [ ] Write hand migration (follow style of
      `backend/migrations/versions/c3e8a1b4f902_event_access_invites.py`):
      - `create_table("community_admins", …)` with composite PK `(community_id,
        user_sub)` and FK constraints + indexes
      - `create_table("community_admin_links", …)` + a **partial unique index**
        `uq_community_admin_links_active` on `community_id WHERE revoked_at IS NULL`
        (enforces a single active link per community; history retained)
      - downgrade drops tables/indexes
      - chain `down_revision` to the current head migration (confirm with `uv
        run alembic heads` in `backend/` or the migrations dir)
- [ ] Register models import path if needed in
      `backend/core/database/model_registry.py` (verify the campuscurrent import
      already covers it).

## Backend — permission checks

- [ ] In `backend/modules/campuscurrent/communities/policy.py`:
      - constructor gains `is_community_admin: bool = False`
      - `UPDATE` branch: allow site-admin **or** owner (`community.owner_user.sub
        == self.user_sub`) **or** `self.is_community_admin`
      - `DELETE` branch: allow **site-admin or owner** (behavior change from
        admin-only — this is intentional per the approved matrix)
      - add `async def check_manage_admins(self, community)` (site-admin or
        owner) for removing OTHER admins
      - add `async def check_admin_link(self, community)` (site-admin, owner, or
        `is_community_admin`) for viewing/rotating the link
      - add `async def check_self_leave(self, community)` — must be a community
        admin; owner gets HTTP 400 ("Owners cannot leave a community")
- [ ] In `backend/modules/campuscurrent/communities/service.py`: change
      `reassign_owner` from `check_admin_only()` to **owner-or-site-admin**
      (approved matrix). Toggle `delete_community` to also pass owner. Keep
      `toggle_verified` as site-admin-only unless the UI needs otherwise (leave
      as-is).
- [ ] Extend `ResourcePermissions` in `backend/common/schemas.py` with
      `can_manage_admins: bool = False` and `can_view_admin_link: bool = False`.

## Backend — repository

- [ ] Add to `CommunityRepository` (`communities/repository.py`):
      - `list_admins(community_id) -> list[CommunityAdmin]` (selectinload the
        linked `User` for name/surname/picture)
      - `add_admin(community_id, user_sub)` / `remove_admin(community_id,
        user_sub)`
      - `is_admin(community_id, user_sub) -> bool`
      - `admin_community_ids(user_sub) -> set[int]` (single batched query for
        list views)
      - `get_active_admin_link(community_id)` (where `revoked_at IS NULL`)
      - `create_admin_link(community_id, token_hash, created_by_sub)` and
        `revoke_admin_link(link)`
      - `get_admin_link_by_token_hash(token_hash)`

## Backend — service

- [ ] In `CommunityService`:
      - compute `is_community_admin = await repo.is_admin(...)` per request and
        pass into `CommunityPolicy(user=user, is_community_admin=...)`
      - `_build_community_response`: include `admins` (list) built from admin
        rows joined with user display fields, and pass the membership set into
        `get_community_permissions`
      - `list_communities`: fetch `repo.admin_community_ids(user_sub)` once and
        pass the set down so the permission hints stay correct for admins
      - new methods: `view_admin_link`, `rotate_admin_link`, `accept_admin_link`,
        `remove_admin`, `leave_admin` delegating to repo + policy checks
      - **Ownership transfer edge case**: in `reassign_owner`, if the new owner
        has an admin row, delete it (owner must not also be an admin)

## Backend — schemas & API

- [ ] In `communities/schemas.py`: add `AdminResponse(sub, name, surname,
      picture, created_at)`, `AdminLinkResponse(url)`,
      `AdminLinkAcceptRequest(token)`, `AdminLinkAcceptResponse(status:
      Literal["granted","already_admin","already_owner"])`. Include `admins:
      list[AdminResponse]` on `CommunityResponse`.
- [ ] In `communities/utils.py`: extend `get_community_permissions` to
      accept an `is_admin_community: bool` (or membership set) and set
      `can_edit`, `can_delete` (owner/site-admin), `can_manage_admins`,
      `can_view_admin_link`.
- [ ] In `communities/api.py` add endpoints (all via service; keep the
      `slug`-taken handling on the existing PATCH):
      - `GET  /communities/{slug}/admin-link` → owner/admin; lazily create if
        none active; returns `{ url }`
      - `POST /communities/{slug}/admin-link/rotate` → owner/admin; sets
        `revoked_at` on active row + inserts new; returns fresh `{ url }`
      - `POST /communities/{slug}/admins/me` delete → self-leave
      - `DELETE /communities/{slug}/admins/{user_sub}` → owner/site-admin
      - `POST /communities/admin-links/accept` body `{ token }` →
        `get_creds_or_401`; resolve hash → active row; **no-op** (200,
        `already_admin` / `already_owner`) if already admin or owner; otherwise
        insert and return `granted`; invalid/revoked → 404/410
- [ ] Backend verification:
      - [ ] `cd backend && uv run ruff check --fix . && uv run black .`
      - [ ] `uv run pytest`

---

## Admin Access Link — mechanics (confirm against implementation)

- [ ] Token = `secrets.token_urlsafe(32)`; store ONLY `sha256(token)` in
      `token_hash` (never the raw token). Revealed artifact =
      `{APP_ORIGIN}/communities/{slug}?admin={raw}` (slug is a hint only;
      authorization is token-based).
- [ ] Rotation invalidates the previous link (set `revoked_at`; partial unique
      index guarantees one active row). Owner **and** admins may rotate.
- [ ] Redemption is idempotent: already-admin → no-op `already_admin`;
      owner → `already_owner`; neither → insert `granted`. No pending/approval
      state.

---

## Frontend — API layer

- [ ] Regenerate `web/src/api/schema.d.ts` with `pnpm api:generate` after the
      backend endpoints exist (verify `pnpm --dir web api:generate`; it reads an
      offline OpenAPI export — see `web/scripts/generate-api-types.mjs`).
- [ ] Update `web/src/features/communities/api.ts` with mutations:
      `useRotateAdminLink`, `useRemoveCommunityAdmin`, `useLeaveCommunity`,
      `useAcceptCommunityAdminLink`; invalidate `qk.communities.all()` and/or
      `qk.communities.detail(slug)` on success. Update `types.ts` for
      `admins`/link response fields.
- [ ] Redemption wiring: on the community detail route, read `?admin=` from the
      search params and POST it on load; toast result
      ("You're now an admin of …" / already-admin / already-owner); then
      navigate so the token is removed from the URL; invalidate queries.

## Frontend — route renames (TanStack file-based routing regenerates the tree)

- [ ] Rename `web/src/routes/_app/communities/$slug.edit-details.tsx` →
      `$slug.settings.tsx` (route `/communities/$slug/settings`).
- [ ] Rename `web/src/routes/_app/communities/$slug.edit-page.tsx` →
      `$slug.editor.tsx` (route `/communities/$slug/editor`).
- [ ] Drop old `/edit-details` / `/edit-page` references everywhere; confirm
      `web/src/routeTree.gen.ts` regenerated and builds.

## Frontend — community page (`$slug/index.tsx`)

- [ ] Replace the labeled "Edit details" button with an **icon-only gear
      button**: `Button variant="ghost" size="icon" aria-label="Settings"`
      wrapping `<Link to="/communities/$slug/settings">`, `Settings` icon.
- [ ] Replace the labeled "Design page" button with an **icon-only button using
      a distinct icon** (e.g. `Palette` or `LayoutTemplate`,
      `aria-label="Design page`, `size="icon"`) pointing to `/editor`. Verify
      the lucide icon names exist in the installed `lucide-react`.
- [ ] Keep the Delete button (now shown for owners too, per `canDelete`).

## Frontend — settings page (`$slug.settings.tsx`)

No tabs, no extra containers. One scrolling page reusing the existing details
card, then two plain sections. Loader mirrors the old `edit-details.tsx`
(`communityDetailQueryOptions`).

- [ ] Page header (heading + a "Back to community" / cancel link).
- [ ] **Details section** — move the existing `CommunityForm` card here
      unchanged (`useUpdateCommunity`, slug navigation, media handling).
- [ ] **Admins section** — heading + plain rows (`Separator` between rows):
      - owner row from `owner_user` with an "Owner" `Badge` (not removable)
      - one row per `community.admins[]`: `Avatar` (picture / initials) + name
        + surname + joined date (reuse existing campus date formatter)
      - viewer is owner → `size="icon"` remove button (`UserMinus` icon) on any
        admin row → existing `ConfirmDialog`
      - on the viewer's own admin row → **Leave** control (`LogOut` icon) →
        `ConfirmDialog`
      - empty state via `web/src/components/ui/empty.tsx`
      - distinguish owner/self/other using `useCurrentUser().sub`
- [ ] **Admin Access Link section** — gated by `permissions.can_view_admin_link`:
      - clearly labeled heading "Admin Access Link" and an
        `Alert`/`AlertDescription` plainly stating what the link does (e.g.
        "Anyone with this link who is signed in becomes an admin of this
        community.")
      - read-only `Input` showing the shareable URL + copy `Button`
        (`Copy`/`Check`) → sonner toast
      - rotate `Button` (`RotateCw` icon) with `Tooltip` ("Rotating invalidates
        the current link and issues a new one") — available to owner **and**
        admins; invalidate + refresh the shown URL on success
- [ ] All UI from existing `web/src/components/ui/*` components only. No new
      component library, no hand-rolled equivalents of what shadcn provides.

---

## Final verification

- [ ] Backend: `cd backend && uv run ruff check --fix . && uv run black . &&
      uv run pytest`
- [ ] Frontend: `cd web && pnpm typecheck && pnpm lint && pnpm build`
      (build = `tsc -b && vite build`)
- [ ] Manual sanity (if environment allows): create community, become admin via
      a link, admin edits details, owner removes admin, admin leaves, owner
      rotates link, owner deletes community.
- [ ] Update the Status block above to `done` and mark every checkbox `- [x]`.