import { useState } from "react"
import { CheckIcon, CopyIcon, RotateCwIcon } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { apiErrorMessage } from "@/api/errors"
import { pageAdminLinkQueryOptions, useRotateAdminLink } from "@/lib/pages"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/** The link body only — the page wraps this in a `SettingsSection`. */
export function AdminAccessLink({ slug }: { slug: string }) {
  const { data: adminLink } = useQuery(pageAdminLinkQueryOptions(slug))
  const rotateAdminLink = useRotateAdminLink()
  const [copied, setCopied] = useState(false)
  const [isConfirmingCopy, setIsConfirmingCopy] = useState(false)
  const [isConfirmingRotate, setIsConfirmingRotate] = useState(false)

  const url = adminLink?.url ?? ""

  const copyLink = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success("Link copied to clipboard.")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy the link. Try again.")
    }
  }

  return (
    <div className="space-y-4">
      {/* No `Item` title or description here: the section above already says
          "Admin access link" and what the link does. Repeating it inside the
          row read as a stutter, and the section is the one that scrolls out
          of view — so the warning that matters most belongs up there. */}
      <Input
        readOnly
        value={url}
        aria-label="Admin access link"
        placeholder="Loading link…"
        className="font-mono"
      />

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsConfirmingCopy(true)}
        >
          {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
          Copy link
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsConfirmingRotate(true)}
          disabled={rotateAdminLink.isPending}
        >
          <RotateCwIcon aria-hidden />
          Rotate link
        </Button>
      </div>

      {rotateAdminLink.isError && (
        <p className="text-sm text-destructive" role="alert">
          {apiErrorMessage(
            rotateAdminLink.error,
            "Could not rotate the link. Try again."
          )}
        </p>
      )}

      <ConfirmDialog
        open={isConfirmingCopy}
        onOpenChange={setIsConfirmingCopy}
        title="Copy the admin link?"
        description="Anyone with this link who is signed in becomes an admin of this page. Do not share it publicly."
        confirmLabel="Copy link"
        destructive={false}
        isPending={false}
        onConfirm={() => {
          setIsConfirmingCopy(false)
          void copyLink()
        }}
      />

      <ConfirmDialog
        open={isConfirmingRotate}
        onOpenChange={setIsConfirmingRotate}
        title="Rotate the admin link?"
        description="The current link stops working immediately and a new one is issued. Anyone you shared the old link with loses admin access until you share the new one."
        confirmLabel="Rotate link"
        destructive={false}
        isPending={rotateAdminLink.isPending}
        onConfirm={() => {
          rotateAdminLink.mutate(slug, {
            onSuccess: () => setIsConfirmingRotate(false),
          })
        }}
      />
    </div>
  )
}
