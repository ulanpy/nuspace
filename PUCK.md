# Puck Block Editor Integration — Implementation Guide

> **Package:** `@puckeditor/core` (NOT `@measured/puck`)
>
> This document is a self-contained implementation plan. Each section has
> checkboxes. The executing agent should check off steps as they complete and
> pick up where the previous session left off by scanning for the first
> unchecked box.

---

## Pre-flight

- [x] Verify the working directory is `/Users/sagyzdop/nuspace`
- [x] Verify the `web/` directory exists and is the active frontend (React + TS, Vite, TanStack Router)
- [x] Run `git branch --show-current` to confirm we are on `dev`
- [x] Run `cd web && npm i @puckeditor/core --save` to install the Puck package
- [x] Confirm `@puckeditor/core` appears in `web/package.json` dependencies

---

## Step 1 — Read These Files First (Context for Everything Below)

Read each file fully before writing any code. These contain the patterns,
types, and conventions the implementation must follow.

- [x] `web/src/api/client.ts` — the `api`, `unwrap`, `ApiError` exports
- [x] `web/src/api/schema.d.ts` — search for `CommunityResponse`, `CommunityUpdateRequest`, `SignedUrlRequest`, `SignedUrlResponse` to get exact TS types
- [x] `web/src/features/media/api.ts` — `requestUploadUrls`, `uploadToSignedUrl`, `MediaUploadError`
- [x] `web/src/features/media/types.ts` — `MAX_IMAGE_BYTES`, `validateImage`, `SignedUrlRequest`, `SignedUrlResponse`, `EntityType`, `MediaFormat`
- [x] `web/src/features/media/use-media-upload.ts` — `useMediaUpload`, `UploadItem`
- [x] `web/src/features/communities/api.ts` — `useUpdateCommunity`, `communityDetailQueryOptions`, `toCommunityUploadItems`
- [x] `web/src/features/communities/types.ts` — `Community`, `CommunityUpdate`, `canEditField`, `COMMUNITY_CREATE_ONLY`
- [x] `web/src/features/communities/components/community-form.tsx` — the form component (will be reused as-is)
- [x] `web/src/features/communities/components/community-form-dialog.tsx` — the dialog wrapper (will be removed from detail page)
- [x] `web/src/routes/_app/communities/$slug.tsx` — current detail page (will be modified)
- [x] `web/src/routes/_app/communities/index.tsx` — current list page (no changes needed, but verify create dialog)
- [x] `web/src/components/section.tsx` — reusable `<Section>` wrapper
- [x] `web/src/components/page-header.tsx` — reusable `<PageHeader>` component
- [x] `web/src/components/resilient-image.tsx` — image component with fallback

---

## Step 2 — Create the Feature Directory Structure

Create the `page-editor` feature folder following existing conventions
(`features/<name>/api.ts`, `types.ts`, `components/`).

```
web/src/features/page-editor/
├── config.ts
├── context.tsx
├── plugins/
│   └── gcs-image-plugin.ts
├── components/
│   ├── editor.tsx
│   ├── page-renderer.tsx
│   └── page-header.tsx
└── blocks/
    ├── link-button.tsx
    ├── text-block.tsx
    ├── photo-block.tsx
    ├── video-embed.tsx
    └── columns.tsx
```

- [x] Create the directory structure
- [x] Create empty placeholder files (to verify imports work)

---

## Step 3 — Define TypeScript Types (`config.ts`)

Create `web/src/features/page-editor/config.ts` with the Puck Config type.
All block component types, root props, and category names are defined here
so that every other file in the module imports from this one file.

**Types to define:**

```ts
import type { Config } from "@puckeditor/core";

// --- Block prop types ---

type LinkButtonProps = {
  title: string;
  description: string;
  url: string;
};

type TextBlockProps = {
  body: string; // richtext field → HTML string
};

type PhotoBlockProps = {
  image: string; // URL from gcsImage custom field
  alt: string;
};

type VideoEmbedProps = {
  url: string;
};

type ColumnsProps = {
  col1: string; // slot
  col2: string; // slot
  col3: string; // slot
};

// --- Aggregated ---

type PageComponents = {
  LinkButton: LinkButtonProps;
  TextBlock: TextBlockProps;
  PhotoBlock: PhotoBlockProps;
  VideoEmbed: VideoEmbedProps;
  Columns: ColumnsProps;
};

type PageRootProps = Record<string, never>; // no root fields

type PageCategories = "links" | "media" | "text" | "layout";

export type PageEditorConfig = Config<PageComponents, PageRootProps, PageCategories>;
```

- [x] Create `config.ts` with the types above
- [x] Export the `PageEditorConfig` type

---

## Step 4 — Build Block Components

Each block is a separate file under `blocks/` that exports an object shaped
as `{ fields, render, defaultProps? }` — the shape Puck expects for each
entry in `config.components`.

### 4a. LinkButton (`blocks/link-button.tsx`)

- [x] Create `web/src/features/page-editor/blocks/link-button.tsx`
- [x] Fields: `title` (`{ type: "text" }`), `description` (`{ type: "text" }`), `url` (`{ type: "text" }`)
- [x] `defaultProps`: `{ title: "Link", description: "", url: "" }`
- [x] Render: tappable pill/button showing `title` (bold, larger) and, if `description` is non-empty, a smaller muted line below it. Use Tailwind classes consistent with existing UI (`font-medium`, `text-muted-foreground`, `rounded-lg`, `border`, `p-4`, `hover:bg-accent`)
- [x] Wrap in an `<a>` tag (or `<Link>` from TanStack Router if URL is internal — but use plain `<a>` for now since URLs are user-provided external links)

### 4b. TextBlock (`blocks/text-block.tsx`)

- [x] Create `web/src/features/page-editor/blocks/text-block.tsx`
- [x] Field: `body` with `{ type: "richtext" }` — uses Puck's built-in Tiptap rich text editor
- [x] No custom extensions, no custom menu bar — default Tiptap extension set
- [x] Render: `({ body }) => body` — Puck's richtext renders HTML directly (do NOT wrap in `<div>{body}</div>`)
- [x] No `defaultProps` needed

### 4c. PhotoBlock (`blocks/photo-block.tsx`)

- [x] Create `web/src/features/page-editor/blocks/photo-block.tsx`
- [x] Fields: `image` with `{ type: "gcsImage" }` (our custom field type registered by the plugin), `alt` with `{ type: "text" }`
- [x] `defaultProps`: `{ image: "", alt: "" }`
- [x] Render: if `image` is non-empty, render `<img src={image} alt={alt} className="w-full rounded-lg" />`. If empty, render a placeholder div with an image icon

### 4d. VideoEmbed (`blocks/video-embed.tsx`)

- [x] Create `web/src/features/page-editor/blocks/video-embed.tsx`
- [x] Field: `url` with `{ type: "text" }`
- [x] `defaultProps`: `{ url: "" }`
- [x] Implement a `parseVideoUrl(url: string)` helper that:
  - Detects YouTube (`youtube.com/watch?v=`, `youtu.be/`) → extract video ID → return embed URL `https://www.youtube.com/embed/{id}`
  - Detects Vimeo (`vimeo.com/{id}`) → return embed URL `https://player.vimeo.com/video/{id}`
  - Otherwise return `null`
- [x] Render: if `parseVideoUrl` returns a URL, render `<iframe src={embedUrl} className="aspect-video w-full rounded-lg" allowFullScreen />`. Otherwise render a fallback link: `<a href={url} className="text-primary underline">{url || "Add video URL"}</a>`

### 4e. Columns (`blocks/columns.tsx`)

- [x] Create `web/src/features/page-editor/blocks/columns.tsx`
- [x] Fields: `col1`, `col2`, `col3` — each `{ type: "slot", disallow: ["Columns"] }` (prevents nesting Columns inside Columns)
- [x] Render: `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">` with `<Col1 />`, `<Col2 />`, `<Col3 />`
- [x] No `defaultProps` needed

---

## Step 5 — Assemble the Config Object (`config.ts`)

Import all block configs and assemble the full `pageEditorConfig`.

- [x] Import each block from `./blocks/*`
- [x] Build and export `pageEditorConfig: PageEditorConfig`:

```ts
import { linkButtonBlock } from "./blocks/link-button";
import { textBlock } from "./blocks/text-block";
import { photoBlock } from "./blocks/photo-block";
import { videoEmbedBlock } from "./blocks/video-embed";
import { columnsBlock } from "./blocks/columns";

export const pageEditorConfig: PageEditorConfig = {
  components: {
    LinkButton: linkButtonBlock,
    TextBlock: textBlock,
    PhotoBlock: photoBlock,
    VideoEmbed: videoEmbedBlock,
    Columns: columnsBlock,
  },
  categories: {
    links: { components: ["LinkButton"], title: "Links" },
    media: { components: ["PhotoBlock", "VideoEmbed"], title: "Media" },
    text: { components: ["TextBlock"], title: "Text" },
    layout: { components: ["Columns"], title: "Layout" },
  },
  root: {
    fields: {},  // empty — no Puck root fields; header comes from React Context
    render: ({ children }) => {
      // Root render will be enhanced in Step 6 with PageHeaderContext
      return <>{children}</>;
    },
  },
};
```

- [x] Verify: no "other" category appears (all components are categorized)
- [x] Verify: `root.fields` is empty (no title/description fields in Puck's data model)

---

## Step 6 — React Context + PageHeader (`context.tsx`, `components/page-header.tsx`)

### 6a. Contexts (`context.tsx`)

- [x] Create `web/src/features/page-editor/context.tsx`
- [x] Define and export `PageHeaderContext`:

```ts
import { createContext, useContext } from "react";

export interface PageHeaderData {
  title?: string;
  imageUrl?: string;  // banner or profile image URL
  subtitle?: string;
}

export const PageHeaderContext = createContext<PageHeaderData | null>(null);

export function usePageHeader(): PageHeaderData | null {
  return useContext(PageHeaderContext);
}
```

- [x] Define and export `UploadContext` (needed by the gcsImage plugin):

```ts
export interface UploadContextData {
  entityType: string;  // e.g. "communities"
  entityId: number;
}

export const UploadContext = createContext<UploadContextData | null>(null);

export function useUploadContext(): UploadContextData | null {
  return useContext(UploadContext);
}
```

### 6b. PageHeader Component (`components/page-header.tsx`)

- [x] Create `web/src/features/page-editor/components/page-header.tsx`
- [x] This is a presentational component that receives `PageHeaderData` props
- [x] Render: banner image (full width, aspect-[3/1]), profile/avatar image (if available), title, subtitle
- [x] Use `<ResilientImage>` from `@/components/resilient-image` for image rendering
- [x] Style consistently with the existing community detail page header in `$slug.tsx` (banner, overlapping avatar, name, badges)
- [x] If no header data is provided (all undefined), render nothing

### 6c. Update root.render in config

- [x] Update `config.ts` root render to use `PageHeaderContext`:

```ts
import { usePageHeader } from "./context";

root: {
  fields: {},
  render: ({ children }) => {
    const header = usePageHeader();
    return (
      <>
        {header && <PageHeader {...header} />}
        {children}
      </>
    );
  },
},
```

- [x] Verify: the root render returns `children` — without this, no blocks will render

**Decoupling report:** The `PageHeaderContext` is defined in the shared module with generic field names (`title`, `imageUrl`, `subtitle`) — not community-specific names like `logo`, `banner`, `name`. The community edit/view routes wrap `<Editor>`/`<PageRenderer>` in `<PageHeaderContext.Provider>` supplying values from the community entity. A future user-page route does the same with user entity data. The shared module never imports from `features/communities/` or knows which entity type it's rendering for.

---

## Step 7 — GCS Image Upload Plugin (`plugins/gcs-image-plugin.ts`)

- [x] Create `web/src/features/page-editor/plugins/gcs-image-plugin.ts`
- [x] Import `requestUploadUrls`, `uploadToSignedUrl` from `@/features/media/api`
- [x] Import `MAX_IMAGE_BYTES`, `validateImage` from `@/features/media/types`
- [x] Import `useUploadContext` from `../context`
- [x] Import `createUsePuck`, `FieldLabel` from `@puckeditor/core`
- [x] Define `MAX_PAGE_IMAGES = 20`

**Plugin structure:**

```ts
import type { Plugin } from "@puckeditor/core";
import { createUsePuck, FieldLabel } from "@puckeditor/core";

const MAX_PAGE_IMAGES = 20;

export const gcsImagePlugin: Plugin = {
  name: "gcs-image-upload",

  overrides: {
    fieldTypes: {
      gcsImage: ({ name, onChange, value }) => {
        // This is the render function for the gcsImage field in the editor sidebar.
        //
        // Implementation:
        // 1. Use useUploadContext() to get { entityType, entityId }
        // 2. Use createUsePuck() to access s.appState.data for counting PhotoBlocks
        // 3. Count all PhotoBlock instances recursively (including inside slot children of Columns)
        //    - If count >= MAX_PAGE_IMAGES, show error message and disable file picker
        // 4. Render a file input (hidden) + a button/area to trigger it
        // 5. On file select:
        //    a. Validate: check file.size <= MAX_IMAGE_BYTES, show inline error if exceeded
        //    b. Validate: check file.type is in ACCEPTED_IMAGE_TYPES
        //    c. Call requestUploadUrls([{ entityType, entityId, media_format: "carousel", media_order: 0, mime_type: file.type }])
        //    d. Call uploadToSignedUrl(response[0], file)
        //    e. Call onChange(response[0].filename) — stores the GCS filename as the field value
        // 6. If value is non-empty, show a thumbnail/preview and a remove button that calls onChange("")
        //
        // Use FieldLabel from @puckeditor/core for consistent styling:
        // <FieldLabel label="Image">
        //   <input type="file" accept="image/*" ... />
        // </FieldLabel>
        //
        // IMPORTANT: Use plain fetch for the upload (uploadToSignedUrl already does this).
        // Do NOT use the openapi-fetch client for the GCS PUT.
      },
    },
  },
};
```

- [x] Implement the `gcsImage` field render function as described above
- [x] Implement a helper to recursively count PhotoBlock instances in Puck data:

```ts
function countPhotoBlocks(items: any[]): number {
  let count = 0;
  for (const item of items) {
    if (item.type === "PhotoBlock") count++;
    // Check slot fields for nested blocks
    for (const key of Object.keys(item.props || {})) {
      const val = item.props[key];
      if (Array.isArray(val)) count += countPhotoBlocks(val);
    }
  }
  return count;
}
```

- [x] Test that the plugin can be loaded into `<Puck plugins={[gcsImagePlugin]}>` without errors

---

## Step 8 — Editor and PageRenderer Components

### 8a. Editor (`components/editor.tsx`)

- [x] Create `web/src/features/page-editor/components/editor.tsx`
- [x] Props interface:

```ts
interface EditorProps {
  data: Record<string, unknown>;   // the page_content JSON payload
  onPublish: (data: Record<string, unknown>) => void;
  isPending?: boolean;
}
```

- [x] Implementation:

```tsx
import { Puck } from "@puckeditor/core";
import { pageEditorConfig } from "../config";
import { gcsImagePlugin } from "../plugins/gcs-image-plugin";

export function Editor({ data, onPublish, isPending }: EditorProps) {
  return (
    <Puck
      config={pageEditorConfig}
      data={data}
      onPublish={onPublish}
      plugins={[gcsImagePlugin]}
    />
  );
}
```

- [x] Verify: `<Editor>` does NOT fetch data, does NOT know about communities, does NOT contain save logic

### 8b. PageRenderer (`components/page-renderer.tsx`)

- [x] Create `web/src/features/page-editor/components/page-renderer.tsx`
- [x] Props interface:

```ts
interface PageRendererProps {
  data: Record<string, unknown>;
}
```

- [x] Implementation:

```tsx
import { Render } from "@puckeditor/core";
import { pageEditorConfig } from "../config";

export function PageRenderer({ data }: PageRendererProps) {
  return <Render config={pageEditorConfig} data={data} />;
}
```

- [x] Verify: `<PageRenderer>` is a thin wrapper — no data fetching, no entity knowledge

---

## Step 9 — Create the Edit Route (`$slug.edit.tsx`)

- [x] Create `web/src/routes/_app/communities/$slug.edit.tsx`

This creates the URL `/communities/{slug}/edit`. TanStack Router file-based
routing handles this automatically from the filename.

**Route structure:**

```tsx
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError } from "@/api/client";
import { communityDetailQueryOptions, useUpdateCommunity } from "@/features/communities/api";
import { CommunityForm, type CommunitySubmitPayload } from "@/features/communities/components/community-form";
import { Editor } from "@/features/page-editor/components/editor";
import { PageHeaderContext, type PageHeaderData } from "@/features/page-editor/context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiErrorMessage } from "@/api/errors";
import { api, unwrap } from "@/api/client";

export const Route = createFileRoute("/_app/communities/$slug/edit")({
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(
        communityDetailQueryOptions(params.slug)
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  component: CommunityEditPage,
});

function CommunityEditPage() {
  const { slug } = Route.useParams();
  const { data: community } = useSuspenseQuery(communityDetailQueryOptions(slug));
  const updateCommunity = useUpdateCommunity();

  // --- Details section (reuses CommunityForm outside the Dialog) ---
  const [detailsPending, setDetailsPending] = useState(false);

  const handleDetailsSubmit = ({ update, items }: CommunitySubmitPayload) => {
    // This mirrors the save logic from community-form-dialog.tsx
    // but without the Dialog wrapper
    setDetailsPending(true);
    const loading = toast.loading("Saving community…");
    updateCommunity.mutate(
      { slug: community.slug, id: community.id, body: update, items },
      {
        onSuccess: (result) => {
          toast.success("Community updated.", { id: loading });
          setDetailsPending(false);
          // Handle slug rename if needed
        },
        onError: (error) => {
          toast.error(apiErrorMessage(error, "Could not save. Try again."), { id: loading });
          setDetailsPending(false);
        },
      }
    );
  };

  // --- Page content section ---
  const [pageContent, setPageContent] = useState(community.page_content ?? {});
  const [publishPending, setPublishPending] = useState(false);

  const handlePublish = (data: Record<string, unknown>) => {
    setPublishPending(true);
    const loading = toast.loading("Publishing page…");
    unwrap(
      api.PATCH("/communities/{slug}", {
        params: { path: { slug } },
        body: { page_content: data },
      })
    )
      .then(() => {
        toast.success("Page published.", { id: loading });
        setPageContent(data);
        setPublishPending(false);
        // Invalidate queries
      })
      .catch((error) => {
        toast.error(apiErrorMessage(error, "Could not publish. Try again."), { id: loading });
        setPublishPending(false;
      });
  };

  // --- Header context for the Puck root.render ---
  const headerData: PageHeaderData = {
    title: community.name,
    // imageUrl from community media — use selectMedia from features/media/select
    // subtitle from community.category/type
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <h1 className="text-2xl font-bold">Edit {community.name}</h1>

      {/* Section 1: Details form */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Details</h2>
        <CommunityForm
          community={community}
          isPending={detailsPending}
          onSubmit={handleDetailsSubmit}
          onCancel={() => {/* navigate back */}}
        />
      </Card>

      {/* Section 2: Page content editor */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Page content</h2>
        <p className="text-sm text-muted-foreground">
          Design your community page with blocks. Click Publish when ready.
        </p>

        <PageHeaderContext.Provider value={headerData}>
          <Editor
            data={pageContent}
            onPublish={handlePublish}
            isPending={publishPending}
          />
        </PageHeaderContext.Provider>

        <div className="flex justify-end">
          <Button onClick={() => handlePublish(pageContent)} disabled={publishPending}>
            {publishPending ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

- [x] Complete the implementation with proper error handling
- [x] Wire up the `selectMedia` utility to get banner/profile URLs for the header context
- [x] Add `invalidateQueries` on successful details save and publish
- [x] Handle slug rename on details save (navigate to new slug if changed)
- [x] Verify the route compiles and the URL pattern `/communities/$slug/edit` works

---

## Step 10 — Modify the Public Detail Page (`$slug.tsx`)

- [x] Open `web/src/routes/_app/communities/$slug.tsx`

### Changes to make:

1. **Replace the "About us" placeholder with `<PageRenderer>`:**

   Find the placeholder:
   ```tsx
   <Card className="p-6">
     <h2 className="text-xl font-semibold">About us</h2>
     <p className="text-muted-foreground">
       This community has not added a page yet.
     </p>
   </Card>
   ```

   Replace with:
   ```tsx
   import { PageRenderer } from "@/features/page-editor/components/page-renderer";
   import { PageHeaderContext, type PageHeaderData } from "@/features/page-editor/context";
   import { selectMedia } from "@/features/media/select";

   // ... inside CommunityDetail, after the header section:

   const headerData: PageHeaderData = {
     title: community.name,
     imageUrl: selectMedia(community.media, "banner")?.url,
     subtitle: `${community.category} · ${community.type}`,
   };

   // Replace the "About us" Card:
   <PageHeaderContext.Provider value={headerData}>
     <PageRenderer data={community.page_content ?? {}} />
   </PageHeaderContext.Provider>
   ```

2. **Replace the Edit button's modal trigger with a navigation link:**

   Find:
   ```tsx
   <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
     <PencilIcon aria-hidden />
     Edit
   </Button>
   ```

   Replace with:
   ```tsx
   <Button render={<Link to="/communities/$slug/edit" params={{ slug }} />} variant="outline" size="sm">
     <PencilIcon aria-hidden />
     Edit
   </Button>
   ```

3. **Remove the `<CommunityFormDialog>` component and its state:**

   Remove:
   - `const [isEditing, setIsEditing] = useState(false)`
   - The `<CommunityFormDialog>` JSX
   - The import of `CommunityFormDialog`

4. **Add missing imports:**
   - `import { Link } from "@tanstack/react-router"` (may already be imported)
   - `import { PageRenderer } from "@/features/page-editor/components/page-renderer"`
   - `import { PageHeaderContext } from "@/features/page-editor/context"`
   - `import { selectMedia } from "@/features/media/select"`

- [x] Make all the changes above
- [x] Verify the detail page renders the published page_content via `<PageRenderer>`
- [x] Verify the Edit button navigates to `/communities/$slug/edit`
- [x] Verify the create dialog on the list page (`index.tsx`) still works unchanged

---

## Step 11 — Verify and Fix

- [x] Run `cd web && npm run build` — fix any TypeScript errors
- [x] Run `cd web && npm run dev` — start the dev server
- [x] Navigate to `/communities` — verify the list page renders, create dialog works
- [x] Navigate to `/communities/{slug}` — verify the detail page renders banner, name, and published page_content
- [x] Navigate to `/communities/{slug}/edit` — verify the edit page shows:
  - [x] Details form at the top (name, slug, email, profile picture, banner)
  - [x] Puck editor below with all block types in the sidebar
  - [x] Publish button that saves `page_content` via PATCH
- [x] Test adding each block type in the Puck editor and verify they render correctly
- [x] Test the Columns layout: drag blocks into columns, verify grid layout
- [x] Test the gcsImage field: pick a file, verify upload flow (check browser network tab for signed URL request + PUT)
- [x] Test the 10MB client-side limit: try to upload a large file, verify error message
- [x] Test the 20-image limit: add 20 PhotoBlocks, verify the 21st shows an error
- [x] Test the Publish flow: add blocks, click Publish, verify the PATCH request fires with `page_content` in the body
- [x] Verify the public detail page shows the published content after saving

---

## Step 12 — Cleanup

- [x] Remove any console.log statements added during development
- [x] Remove the TODO comment in `community-form.tsx` that mentions block editor (line ~186: `// TODO: page_content editing (block editor)`)
- [x] Verify no unused imports in modified files
- [x] Verify `CommunityFormDialog` is still used by the list page's create flow (it should be — only removed from `$slug.tsx`)
- [x] Run `cd web && npm run build` one final time to confirm clean build

---

## Notes for the Executing Agent

1. **Do not read or reference `/frontend`** — it is dead legacy code. Only `/web` is active.
2. **Package name is `@puckeditor/core`** — NOT `@measured/puck`. All imports come from `@puckeditor/core`.
3. **The Puck data payload shape** is `{ content: [...], root: { props: {...} } }`. Since `root.fields` is empty, `root.props` will be `undefined` or `{}`.
4. **`onPublish`** fires when the user clicks Publish in the Puck UI. This is the ONLY save trigger — do NOT use `onChange`.
5. **The `gcsImage` field** needs entity info (entityType, entityId) to request signed URLs. This comes from `UploadContext`, which the `<Editor>` wrapper provides.
6. **Slot `disallow: ["Columns"]`** prevents nesting Columns inside Columns. This is the simplest v1 approach.
7. **The root `render` must return `children`** — otherwise no blocks will be visible.
8. **`richtext` field renders HTML** — use `render: ({ body }) => body`, NOT `<div>{body}</div>`.
9. **When modifying `$slug.tsx`**, be careful not to break the delete confirmation flow or the banner/avatar rendering.
10. **The edit route `$slug.edit.tsx`** must be placed in the SAME directory as `$slug.tsx` for TanStack Router to recognize it as a sibling route.
