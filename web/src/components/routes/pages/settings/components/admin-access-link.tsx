import { useEffect, useRef, useState } from "react"
import { CheckIcon, CopyIcon, RotateCwIcon } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { apiErrorMessage } from "@/api/errors"
import { pageAdminLinkQueryOptions, useRotateAdminLink } from "@/lib/pages"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
} from "@/components/ui/item"

/**
 * The admin access link, as one row: the link, the warning, and the two things
 * you can do to it.
 *
 * The warning lives here rather than in the `SettingsSection` above because a
 * section header scrolls out of view and the row does not — the one sentence
 * that decides whether this gets pasted into a public channel belongs next to
 * the thing being pasted.
 */
export function AdminAccessLink({ slug }: { slug: string }) {
  const { data: adminLink } = useQuery(pageAdminLinkQueryOptions(slug))
  const rotateAdminLink = useRotateAdminLink()
  const [copied, setCopied] = useState(false)
  const [isConfirmingCopy, setIsConfirmingCopy] = useState(false)
  const [isConfirmingRotate, setIsConfirmingRotate] = useState(false)
  // The "copied" tick has to be cancellable: the old `setTimeout` fired
  // `setCopied` two seconds after the component was gone, and rotating the link
  // or leaving the page inside that window wrote to a dead component.
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
    },
    []
  )

  const url = adminLink?.url ?? ""

  const copyLink = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard.")
      setCopied(true)
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy the link. Try again.")
    }
  }

  return (
    <div className="space-y-2">
      <Item variant="muted">
        <ItemContent>
          <Input
            readOnly
            value={url}
            aria-label="Admin access link"
            placeholder="Loading link…"
            className="font-mono"
          />
          <ItemDescription>
            Anyone signed in who opens this link becomes an admin. Do not share
            it publicly.
          </ItemDescription>
        </ItemContent>
        <ItemActions>
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
        </ItemActions>
      </Item>

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
