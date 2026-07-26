import { useRef, useState } from "react"
import { FileUp, Loader2, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { useRegistrarPdfSync, useRegistrarSync } from "../api"
import { registrarErrorMessage } from "../registrar-errors"
import type { RegistrarSyncResponse } from "../types"

function SyncSummary({ result }: { result: RegistrarSyncResponse }) {
  const changes = [
    result.added_count > 0 ? `${String(result.added_count)} added` : null,
    result.deleted_count > 0 ? `${String(result.deleted_count)} removed` : null,
    result.kept_count > 0 ? `${String(result.kept_count)} unchanged` : null,
  ].filter(Boolean)

  return (
    <p className="text-sm">
      Synced {result.total_synced} course
      {result.total_synced === 1 ? "" : "s"}
      {result.term_label && ` for ${result.term_label}`}
      {changes.length > 0 && ` — ${changes.join(", ")}`}.
    </p>
  )
}

export function RegistrarSync() {
  const [password, setPassword] = useState("")
  const [usePdf, setUsePdf] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const sync = useRegistrarSync()
  const pdfSync = useRegistrarPdfSync()

  const active = usePdf ? pdfSync : sync
  const result = active.data

  return (
    <Card className="space-y-4 p-4">
      <div>
        <h2 className="font-semibold">Sync with the registrar</h2>
        <p className="text-sm text-muted-foreground">
          Pulls your registered courses and weekly schedule for the current
          term.
        </p>
      </div>

      {usePdf ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const file = fileRef.current?.files?.[0]
            if (file) pdfSync.mutate(file)
          }}
          className="space-y-3"
        >
          <div className="space-y-1">
            <Label htmlFor="schedule-pdf">Personal schedule PDF</Label>
            <Input
              id="schedule-pdf"
              type="file"
              accept="application/pdf"
              ref={fileRef}
              required
            />
            <p className="text-xs text-muted-foreground">
              Download it from the registrar under My Registrar → Personal
              Schedule, then upload it here.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={pdfSync.isPending}>
              {pdfSync.isPending && (
                <Loader2 className="animate-spin" aria-hidden />
              )}
              <FileUp aria-hidden />
              Upload and sync
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setUsePdf(false)
              }}
            >
              Use my password instead
            </Button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            sync.mutate(password, {
              // Held only long enough to make the request.
              onSettled: () => {
                setPassword("")
              },
            })
          }}
          className="space-y-3"
        >
          <div className="space-y-1">
            <Label htmlFor="registrar-password">Registrar password</Label>
            <Input
              id="registrar-password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
              }}
              autoComplete="off"
              required
            />
          </div>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              Used once to log in to the registrar and never stored — not saved
              to your account, not written to our database, and not kept after
              this request finishes.
            </span>
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={sync.isPending || password.length === 0}
            >
              {sync.isPending && (
                <Loader2 className="animate-spin" aria-hidden />
              )}
              Sync courses
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setUsePdf(true)
                setPassword("")
              }}
            >
              Upload a PDF instead
            </Button>
          </div>
        </form>
      )}

      {active.isError && (
        <p className="text-sm text-destructive" role="alert">
          {registrarErrorMessage(active.error, "syncing your courses")}
        </p>
      )}

      {result && <SyncSummary result={result} />}
    </Card>
  )
}
