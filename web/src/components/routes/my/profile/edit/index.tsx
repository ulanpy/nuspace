import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { apiErrorMessage } from "@/api/errors"
import {
  designToEdit,
  myProfileQueryOptions,
  useSaveProfileDesign,
} from "@/lib/profiles"
import { Editor } from "@/components/shared/page-editor/components/editor"

/**
 * `my.nuspace.kz/profile/edit`: the Page editor, with its twelve blocks, on the
 * viewer's own profile. A profile never saved opens on the About and Links
 * design. The identity header is not in the canvas: it is drawn above the
 * design from the account, so nothing here can remove it.
 *
 * No `UploadContext`: image and video uploads address a Page by id, and a
 * profile has none. The block's upload says so instead of uploading.
 */
export function ProfileEditorScreen() {
  const { data: profile } = useSuspenseQuery(myProfileQueryOptions())
  const save = useSaveProfileDesign()
  const navigate = useNavigate()

  // Read once: the editor owns the design from here on.
  const [design] = useState(() => designToEdit(profile.content ?? null))

  const leave = (handle: string | null) => {
    void (handle
      ? navigate({ to: "/my/u/$handle", params: { handle } })
      : navigate({ to: "/my/profile" }))
  }

  const handlePublish = (data: Record<string, unknown>) => {
    const loading = toast.loading("Publishing profile…")
    save.mutate(data, {
      onSuccess: (settings) => {
        toast.success(
          settings.handle
            ? "Profile published."
            : "Profile saved. Choose a handle to give it an address.",
          { id: loading }
        )
        leave(settings.handle)
      },
      onError: (error) => {
        toast.error(apiErrorMessage(error, "Could not publish. Try again."), {
          id: loading,
        })
      },
    })
  }

  return (
    <div className="h-dvh">
      <Editor
        data={design}
        onPublish={handlePublish}
        onCancel={() => {
          leave(profile.handle)
        }}
      />
    </div>
  )
}
