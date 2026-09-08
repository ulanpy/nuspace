import { useState } from "react"
import { CheckIcon, CopyIcon, RotateCwIcon } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { apiErrorMessage } from "@/api/errors"
import {
  communityAdminLinkQueryOptions,
  useRotateAdminLink,
} from "@/lib/communities"
import { SectionHeading } from "@/components/routes/communities/settings/components/section-heading"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function AdminAccessLinkSection({ slug }: { slug: string }) {
  const { data: adminLink } = useQuery(communityAdminLinkQueryOptions(slug))
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
    <section className="space-y-4">
      <SectionHeading title="Admin access link" />
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            readOnly
            value={url}
            aria-label="Admin access link"
            placeholder="Loading link\u2026"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Copy admin access link"
              onClick={() => setIsConfirmingCopy(true)}
            >
              {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Rotate admin access link"
              onClick={() => setIsConfirmingRotate(true)}
            >
              <RotateCwIcon aria-hidden />
            </Button>
          </div>
        </div>
        {rotateAdminLink.isError && (
          <p className="text-sm text-destructive" role="alert">
            {apiErrorMessage(
              rotateAdminLink.error,
              "Could not rotate the link. Try again."
            )}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={isConfirmingCopy}
        onOpenChange={setIsConfirmingCopy}
        title="Copy the admin link?"
        description="Anyone with this link who is signed in becomes an admin of this community. Do not share it publicly."
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
    </section>
  )
}
