// Stands in for pages.nuspace.kz/p/icpc-2026/editor.
//
// The real editor, not a picture of one: `@/.../page-editor/components/editor`,
// which is the same `<Puck>` the org route at /p/$slug/editor renders. Only the
// two things around it are ours — the seed design, and the contexts the real
// route supplies.
//
// It also drops the shell. `layouts/app/index.tsx` hides the sidebar for
// `/p/$slug/editor` and `/p/$slug`, because the canvas is the page rather than a
// widget in a container — so this screen has no header and no rail, on purpose.
//
// Two providers the app gets from its router and the workbench has to hand it:
// `UploadContext` for the Image and Video blocks, `QueryClientProvider` for the
// template dialog behind "Use template". The dialog stays shut; opening it
// would fetch real pages, which a prototype has no business doing.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { UploadContext } from "@/components/shared/page-editor/context"
import { Editor } from "@/components/shared/page-editor/components/editor"

const queryClient = new QueryClient()

const DESIGN = {
  content: [
    {
      type: "Hero",
      props: {
        id: "hero",
        title: "ICPC 2026",
        description:
          "<p>The regional contest. Three hours, one problem set, and a team of three.</p>",
        fontSize: 16,
        align: "left",
        verticalAlign: "center",
        buttons: [
          {
            label: "Register",
            href: "#",
            variant: "primary",
            size: "large",
            icon: "none",
            iconPosition: "left",
            iconOnly: false,
          },
        ],
        image: {
          mode: "inline",
          placement: "right",
          url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%231d4ed8'/%3E%3Cstop offset='1' stop-color='%230e7490'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='600' fill='url(%23g)'/%3E%3C/svg%3E",
          alt: "",
          aspectRatio: "original",
        },
        verticalGap: "24px",
        horizontalGap: "24px",
        layout: { paddingX: "16px", padding: "64px" },
      },
    },
    {
      type: "Heading",
      props: { id: "schedule", text: "Schedule", level: "2", size: 14 },
    },
    {
      type: "RichText",
      props: {
        id: "schedule-body",
        richtext:
          "<p>Registration opens at 09:00. The practice round runs from 10:00 to 12:00, and the contest itself starts at 13:00 sharp.</p>",
        size: 14,
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

export default function PageEditor() {
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
              window.location.href = "?c=p-icpc-2026"
            }}
          />
        </div>
      </UploadContext.Provider>
    </QueryClientProvider>
  )
}
