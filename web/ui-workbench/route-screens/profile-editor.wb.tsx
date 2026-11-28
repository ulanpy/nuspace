// Stands in for my.nuspace.kz/profile/editor.
//
// This is the real editor, not a picture of one: `@/.../page-editor/components/
// editor`, which is the same `<Puck>` the org route at /p/$slug/editor renders.
// Only the two things around it are ours — the seed design, and the contexts
// the real route supplies.
//
// It also drops the shell. `layouts/app/index.tsx` hides the sidebar for
// `/p/$slug/editor` and `/p/$slug`, because the canvas is the page rather than a
// widget in a container, and the profile editor mirrors that route — so this
// screen has no header and no rail, on purpose.
//
// Two providers the app gets from its router and the workbench has to hand it:
// `UploadContext` for the Image and Video blocks, `QueryClientProvider` for the
// template dialog behind "Use template". The dialog stays shut; opening it
// would fetch real pages, which a prototype has no business doing.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { UploadContext } from "@/components/shared/page-editor/context"
import { Editor } from "@/components/shared/page-editor/components/editor"
import { ME_PROFILE } from "./account.wb.demo"

const queryClient = new QueryClient()

/**
 * A profile is not a blank page, so it does not open as one. The seeded design
 * is the About and Links a new profile is given — see #410, where what the
 * default template holds beyond the live block is still open.
 *
 * A block's `id` lives inside `props`, not beside `type`. Puck reads it as
 * `props.id` when it builds the layer tree, and a block without one lands in
 * that tree as a null node and takes the whole editor down with it.
 */
const DESIGN = {
  content: [
    {
      type: "Heading",
      props: { id: "about-heading", text: "About", level: "2" },
    },
    {
      type: "RichText",
      props: {
        id: "about-body",
        richtext: `<p>${ME_PROFILE.name} ${ME_PROFILE.surname} — ${ME_PROFILE.department}. Third-year computer science, on the CS help desk Tuesdays.</p>`,
      },
    },
    {
      type: "Heading",
      props: { id: "links-heading", text: "Links", level: "2" },
    },
    {
      type: "LinkTree",
      props: {
        id: "links-body",
        buttons: [
          {
            label: "GitHub",
            href: "#",
            variant: "primary",
            size: "large",
            icon: "Globe",
            iconPosition: "left",
          },
          {
            label: "Telegram",
            href: "#",
            variant: "secondary",
            size: "large",
            icon: "MessageCircle",
            iconPosition: "left",
          },
        ],
      },
    },
  ],
  root: {
    props: {
      backgroundColor: "#ffffff",
      textColor: "",
      accentColor: "#1d4ed8",
      fontFamily: "Inter",
      borderRadius: "12px",
    },
  },
}

export default function ProfileEditor() {
  return (
    <QueryClientProvider client={queryClient}>
      <UploadContext.Provider value={{ entityType: "pages", entityId: 1 }}>
        {/* The real route wraps the editor in `h-dvh`; Puck measures its
            canvas through an iframe and finds nothing at zero height. `h-full`
            is the same box here, since the workbench frame is already one
            viewport less its own header. */}
        <div className="h-full">
          <Editor
            data={DESIGN}
            onPublish={() => {}}
            onCancel={() => {
              window.location.href = "?c=u-aiza"
            }}
          />
        </div>
      </UploadContext.Provider>
    </QueryClientProvider>
  )
}
