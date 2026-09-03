# Plan: Slug-Based Community Routing + GCS Upload Generalization

> **Instructions for the agent:** This plan has two independent parts (A and B).
> Work through each part sequentially. After completing each checkbox, mark it
> `[x]`. If you are interrupted and resuming, read this file, find the first
> unchecked box, and continue from there. Track your progress by updating the
> checkboxes as you go. Run the backend linter/formatter (`uv run ruff check --fix . && uv run black .`) and
> frontend build (`npm run build` in `/web`) after each part to verify nothing
> is broken.

---

## Context

- **Repo:** `ulanpy/nuspace`, branch `dev`
- **Backend:** Python 3.12 / FastAPI / PostgreSQL (package: `nuros`)
- **Frontend:** `/web` only (React 19 + TanStack Router/Query + TypeScript). `/frontend` is dead legacy — do not touch.
- **Community model** already has a `slug` column: `Text, NOT NULL, UNIQUE`. Validated server-side at save time (lowercase alphanumeric + hyphens, 3–50 chars, reserved-word blocklist). No live-availability-check endpoint exists or should be added.
- **Users** have no slug-based lookup endpoints and no user detail routes — only `/profile`. No user routes need changing.
- **GCS** images are stored in Google Cloud Storage. Upload flow: frontend gets signed URL → PUTs directly to GCS → Pub/Sub webhook creates `Media` row.

---

## Part A — Route communities by slug instead of by id

### A1. Backend: Add slug-based lookup to repository

**File:** `backend/modules/campuscurrent/communities/repository.py`

- [x] Add a new method `get_by_slug(slug: str) -> Community | None` that queries `Community.slug == slug` with `selectinload(Community.owner_user)`, mirroring the existing `get_by_id` pattern.
- [x] Keep `get_by_id` — it is still used internally by `authorize_media_upload`, Meilisearch operations, and media listing.

### A2. Backend: Update service methods to accept slug

**File:** `backend/modules/campuscurrent/communities/service.py`

- [x] Change `_get_community_or_404` parameter from `community_id: int` to `slug: str`. Call `repo.get_by_slug(slug)` instead of `get_by_id`.
- [x] Change `get_community_response` parameter from `community_id: int` to `slug: str`. Pass `slug` to `_get_community_or_404`.
- [x] Change `update_community` parameter from `community_id: int` to `slug: str`. Look up community via `repo.get_by_slug(slug)`, then use `community.id` for all internal operations (media listing, search updates, etc.).
- [x] Change `delete_community` parameter from `community_id: int` to `slug: str`. Look up community via `repo.get_by_slug(slug)`. In the `delete_from_search` call (line ~143), pass `community.id` (from the ORM object) instead of the old `community_id` parameter.
- [x] `authorize_media_upload` — **DO NOT CHANGE THIS METHOD'S SIGNATURE.** It is called from `backend/modules/google_bucket/service.py:34` as `self._communities.authorize_media_upload(entity_id, user)` where `entity_id` is an integer from the upload request body (not from the URL). This method should stay as `authorize_media_upload(community_id: int, user)` and continue using `repo.get_by_id(community_id)`. It is an internal authorization check, not a public-facing URL endpoint.

### A3. Backend: Update API endpoints to use slug path params

**File:** `backend/modules/campuscurrent/communities/api.py`

- [x] Change `GET /communities/{community_id}` → `GET /communities/{slug: str}`. Update the handler parameter from `community_id: int` to `slug: str`. Pass `slug` to `community_service.get_community_response`.
- [x] Change `PATCH /communities/{community_id}` → `PATCH /communities/{slug: str}`. Update the handler parameter. Pass `slug` to `community_service.update_community`.
- [x] Change `DELETE /communities/{community_id}` → `DELETE /communities/{slug: str}`. Update the handler parameter. Pass `slug` to `community_service.delete_community`.
- [x] Do NOT change `POST /communities` (create) or `GET /communities` (list) — these don't take a community identifier in the path.

### A4. Backend: Verify and run

- [x] Run `uv run ruff check --fix .` and `uv run black .` in `backend/`.
- [x] Run `uv run pytest` to verify no regressions.
- [x] Verify the OpenAPI schema (if accessible at `/docs`) shows the new slug-based paths.

### A5. Frontend: Rename route and update route definition

- [x] Rename the route file: `web/src/routes/_app/communities/$communityId.tsx` → `web/src/routes/_app/communities/$slug.tsx`
- [x] In the renamed file, update `createFileRoute("/_app/communities/$communityId")` → `createFileRoute("/_app/communities/$slug")`
- [x] Update `Route.useParams()` — destructure `slug` instead of `communityId`:
  ```ts
  const { slug } = Route.useParams()
  ```
- [x] Update the `loader` to pass `slug` (string) instead of `Number(params.communityId)`:
  ```ts
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      communityDetailQueryOptions(params.slug)
    ),
  ```
- [x] Update the `useSuspenseQuery` call to use `slug` instead of `Number(communityId)`:
  ```ts
  const { data: community } = useSuspenseQuery(
    communityDetailQueryOptions(slug)
  )
  ```

### A6. Frontend: Update community API layer

**File:** `web/src/features/communities/api.ts`

- [x] Change `fetchCommunity(communityId: number)` → `fetchCommunity(slug: string)`. Update the API call from `api.GET("/communities/{community_id}", { params: { path: { community_id: communityId } } })` → `api.GET("/communities/{slug}", { params: { path: { slug } } })`.
- [x] Change `communityDetailQueryOptions(communityId: number)` → `communityDetailQueryOptions(slug: string)`. Update the query key and fetch call.
- [x] Update `useDeleteCommunity` — the `mutationFn` currently takes `(id: number)` and calls `api.DELETE("/communities/{community_id}", ...)`. Change to accept `(slug: string)` and call `api.DELETE("/communities/{slug}", { params: { path: { slug } } })`.
- [x] Update `useUpdateCommunity` — it takes `{ id, body, items }`. Change `id: number` to `slug: string` in the mutation params. Update the PATCH call to use slug: `api.PATCH("/communities/{slug}", { params: { path: { slug } }, body })`. The media upload still uses `entityId: id` — but `id` is no longer passed in. Instead, get the community's integer `id` from the `saveWithMedia` result (the `result.entity.id` from the PATCH response). **OR** keep `id: number` alongside `slug: string` in the mutation params if the PATCH response doesn't return the full entity. Check the actual flow.
- [x] Update `refreshWhenMediaLands` — it takes `communityId: number` and calls `fetchCommunity(communityId)`. Change to `slug: string` and call `fetchCommunity(slug)`.

### A7. Frontend: Update query keys

**File:** `web/src/api/query-keys.ts`

- [x] Change `detail: (id: number) => ["communities", "detail", id] as const` → `detail: (slug: string) => ["communities", "detail", slug] as const`.

### A8. Frontend: Update all link/navigation construction sites

- [x] **`web/src/features/communities/components/community-card.tsx`** (lines 17-18): Change `to="/communities/$communityId"` → `to="/communities/$slug"` and `params={{ communityId: String(community.id) }}` → `params={{ slug: community.slug }}`.
- [x] **`web/src/routes/_app/communities/index.tsx`** (lines 170-174): After community creation, change `navigate({ to: "/communities/$communityId", params: { communityId: String(community.id) } })` → `navigate({ to: "/communities/$slug", params: { slug: community.slug } })`.
- [x] **`web/src/routes/_app/profile.tsx`** (lines 52-53): Change `to="/communities/$communityId"` → `to="/communities/$slug"` and `params={{ communityId: String(community.id) }}` → `params={{ slug: community.slug }}`.

### A9. Frontend: Remove legacy `?id=` redirect

**File:** `web/src/routes/_app/communities/index.tsx`

- [x] Remove the `id: z.coerce.number().optional()` field from `communitiesSearchSchema`.
- [x] Remove the entire `beforeLoad` hook that redirects `/communities?id=123` to `/communities/123`. (This was kept for backward compatibility with the old app, but since the URL scheme is changing anyway, it's no longer needed.)

### A10. Frontend: Rename the slug field label in community forms

**File:** `web/src/features/communities/components/community-form.tsx` (or wherever the community create/edit form renders the slug input)

- [x] The slug input field label should NOT say "Slug" — that's a developer term. Use the conventional user-facing label: **"Handle"**. The placeholder/example text should show the format (e.g., `nu-fencing-club`).
- [x] The API field name stays `slug` — only the visible label changes.

### A11. Frontend: Update community types if needed

**File:** `web/src/features/communities/types.ts`

- [x] Verify that `Community` type (from generated schema) already includes `slug: str`. It should, since `CommunityResponse` extends `BaseCommunity` which has `slug: str`. No change expected.

### A12. Frontend: Update the community form dialog call sites

**File:** `web/src/features/communities/components/community-form-dialog.tsx`

- [x] The `updateCommunity.mutate` call (line 94) passes `{ id: community.id, body: update, items }`. After A6 changes the mutation params, update this to pass `{ slug: community.slug, body: update, items }` (or whatever the new shape is).
- [x] The `createCommunity.mutate` call (line 109) passes `{ body: create, items }`. The `onSaved` callback receives the created community. The parent (`index.tsx`) uses `community.slug` for navigation — verify the create response includes `slug`.

### A13. Frontend: Verify and build

- [x] Run `npm run build` in `web/` to verify TypeScript compilation and no import errors.
- [x] Manually verify (or grep) that no references to `$communityId` or `communityId` remain in `/web/src/routes/` or `/web/src/features/communities/`.

---

## Part B — Generalize the GCS signed-upload-URL endpoint

### B1. Backend: Add `purpose` and `file_size` to request schema

**File:** `backend/modules/google_bucket/schemas.py`

- [x] Add `purpose: str | None = None` to `SignedUrlRequest`. This is a logical folder/category for the upload (e.g., `"logo"`, `"banner"`, `"page-content"`). When omitted, defaults to `media_format` value.
- [x] Add `file_size: int | None = None` to `SignedUrlRequest`. The caller-reported file size in bytes. When provided, validated against the 10MB max server-side.
- [x] Add `purpose: str | None = None` to `SignedUrlResponse` so the caller knows what was used.
- [x] Add a constant `MAX_FILE_SIZE = 10 * 1024 * 1024` (10 MB) in this file or in the api.py.

### B2. Backend: Add server-side file size validation

**File:** `backend/modules/google_bucket/api.py`

- [x] In the `generate_upload_url` handler, after the auth check and before generating URLs, iterate over `signed_url_request` items. For each item where `file_size is not None`, validate `file_size <= MAX_FILE_SIZE`. Raise `HTTPException(400, detail=f"File size {file_size} exceeds maximum of {MAX_FILE_SIZE} bytes")` if violated.
- [x] This is backward-compatible: existing callers that don't send `file_size` are unaffected.

### B3. Backend: Reorganize GCS path to include purpose

**File:** `backend/modules/google_bucket/api.py`

- [x] Change the filename generation from:
  ```python
  filename = f"{config.ROUTING_PREFIX}/{user[0].get('sub')}_{timestamp}_{uuid.uuid4().hex}"
  ```
  to:
  ```python
  purpose = item.purpose or item.media_format.value
  filename = f"{config.ROUTING_PREFIX}/{item.entity_type.value}/{item.entity_id}/{purpose}/{user[0].get('sub')}_{timestamp}_{uuid.uuid4().hex}"
  ```
- [x] Verify the GCS Pub/Sub webhook (`gcs_webhook` handler) still works with the new path structure. The webhook parses `gcs_event.name.split("/", maxsplit=1)` and checks `parts[0] == config.ROUTING_PREFIX`. The new path still starts with the routing prefix, so this should work. But verify the `_media_upsert_from_event` function and the media path routing logic (line 182-184).
- [x] Verify the dev emulator proxy paths (`local-upload` and `local-download`) still work — they use `full_path` which is the complete filename, so they should be fine.

### B4. Backend: Verify and run

- [x] Run `uv run ruff check --fix .` and `uv run black .` in `backend/`.
- [x] Run `uv run pytest` to verify no regressions.
- [x] Regenerate the frontend API types if the schema changed (check if there's a codegen script).

### B5. Frontend: Regenerate API schema types

- [x] Check if `web/src/api/schema.d.ts` is auto-generated (likely from the backend OpenAPI spec). If so, regenerate it after the backend changes.
- [x] Verify the new `purpose` and `file_size` fields appear in the generated `SignedUrlRequest` type.

### B6. Frontend: No changes to existing upload call sites

- [x] The existing call sites in `web/src/features/media/api.ts`, `web/src/features/communities/api.ts`, and `web/src/features/events/api.ts` do NOT need changes — the new fields are optional with sensible defaults.
- [x] Future page-content uploads can pass `{ purpose: "page-content", file_size: file.size }` when ready.

### B7. Frontend: Build verification

- [x] Run `npm run build` in `web/` to verify TypeScript compilation.

---

## Post-completion checklist

- [x] All Part A checkboxes are `[x]`
- [x] All Part B checkboxes are `[x]`
- [x] Backend linter and formatter pass (`uv run ruff check --fix . && uv run black .`)
- [x] Backend tests pass (`uv run pytest`)
- [x] Frontend builds successfully (`npm run build` in `web/`)
- [x] No references to `$communityId` remain in `/web/src/routes/` or `/web/src/features/communities/`
- [x] No references to `community_id` remain in community API endpoint path params (only in internal service/repository code where integer id is still used after slug lookup)
