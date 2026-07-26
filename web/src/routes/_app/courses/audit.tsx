import { useRef, useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { FileUp, Loader2, ShieldCheck } from "lucide-react"
import { z } from "zod"

import {
  auditCatalogQueryOptions,
  cachedAuditQueryOptions,
  useRegistrarAudit,
  useTranscriptAudit,
} from "@/features/courses/api"
import { AuditResult } from "@/features/courses/components/audit-result"
import { registrarErrorMessage } from "@/features/courses/registrar-errors"
import { QueryBoundary } from "@/components/query-boundary"
import { ToggleChip } from "@/components/toggle-chip"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const auditSearchSchema = z.object({
  /**
   * Admission year — requirements differ by catalogue year.
   *
   * Coerced rather than plain string: the router JSON-encodes search values, so
   * a year round-trips as `?year=%222024%22`. Someone linking or editing the URL
   * by hand will write `?year=2024`, which parses as a number and would fail a
   * bare `z.string()`.
   */
  year: z.coerce.string().optional(),
  majors: z.array(z.string()).optional(),
  minors: z.array(z.string()).optional(),
})

export const Route = createFileRoute("/_app/courses/audit")({
  validateSearch: auditSearchSchema,
  component: DegreeAudit,
})

function DegreeAudit() {
  const { year, majors = [], minors = [] } = Route.useSearch()
  const navigate = Route.useNavigate()

  const [password, setPassword] = useState("")
  const [usePdf, setUsePdf] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const catalog = useQuery(auditCatalogQueryOptions())
  const cached = useQuery(cachedAuditQueryOptions(year, majors[0]))

  const registrarAudit = useRegistrarAudit()
  const transcriptAudit = useTranscriptAudit()
  const active = usePdf ? transcriptAudit : registrarAudit

  const years = catalog.data?.years ?? []
  const activeYear = years.find((entry) => entry.year === year)?.year
  const availableMajors = activeYear
    ? (years.find((entry) => entry.year === activeYear)?.majors ?? [])
    : []
  const availableMinors = catalog.data?.minors ?? []

  const canRun = Boolean(activeYear) && majors.length > 0

  // A freshly run audit wins over whatever was cached from last time.
  const result = active.data ?? cached.data ?? undefined

  const toggle = (key: "majors" | "minors", value: string) => {
    const current = key === "majors" ? majors : minors
    const next = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value]

    void navigate({
      search: (prev) => ({
        ...prev,
        [key]: next.length > 0 ? next : undefined,
      }),
    })
  }

  const selection = {
    year: activeYear ?? "",
    majors,
    minors,
  }

  return (
    <div className="space-y-4">
      <QueryBoundary query={catalog}>
        {() => (
          <Card className="space-y-4 p-4">
            <div>
              <h2 className="font-semibold">Run a degree audit</h2>
              <p className="text-sm text-muted-foreground">
                Checks your transcript against the requirements for your
                admission year.{" "}
                <Link
                  to="/degree-audit-info"
                  className="underline underline-offset-3 hover:text-foreground"
                >
                  How it works
                </Link>
                .
              </p>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Admission year</legend>
              <div className="flex flex-wrap gap-1">
                {years.map((entry) => (
                  <ToggleChip
                    key={entry.year}
                    label={entry.year}
                    isActive={activeYear === entry.year}
                    onClick={() => {
                      // Majors are year-specific, so changing year clears them
                      // rather than leaving a selection that may not exist.
                      void navigate({
                        search: (prev) => ({
                          ...prev,
                          year: entry.year,
                          majors: undefined,
                        }),
                      })
                    }}
                  />
                ))}
              </div>
            </fieldset>

            {activeYear && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Major</legend>
                <div className="flex flex-wrap gap-1">
                  {availableMajors.map((major) => (
                    <ToggleChip
                      key={major}
                      label={major}
                      isActive={majors.includes(major)}
                      onClick={() => {
                        toggle("majors", major)
                      }}
                    />
                  ))}
                </div>
              </fieldset>
            )}

            {activeYear && availableMinors.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">
                  Minor{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </legend>
                <div className="flex flex-wrap gap-1">
                  {availableMinors.map((minor) => (
                    <ToggleChip
                      key={minor}
                      label={minor}
                      isActive={minors.includes(minor)}
                      onClick={() => {
                        toggle("minors", minor)
                      }}
                    />
                  ))}
                </div>
              </fieldset>
            )}

            {usePdf ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  const file = fileRef.current?.files?.[0]
                  if (file) transcriptAudit.mutate({ ...selection, file })
                }}
                className="space-y-3"
              >
                <div className="space-y-1">
                  <Label htmlFor="transcript-pdf">Unofficial transcript</Label>
                  <Input
                    id="transcript-pdf"
                    type="file"
                    accept="application/pdf"
                    ref={fileRef}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Download it from the registrar, then upload it here.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!canRun || transcriptAudit.isPending}
                  >
                    {transcriptAudit.isPending && (
                      <Loader2 className="animate-spin" aria-hidden />
                    )}
                    <FileUp aria-hidden />
                    Run audit
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
                  registrarAudit.mutate(
                    { ...selection, password },
                    {
                      onSettled: () => {
                        setPassword("")
                      },
                    }
                  )
                }}
                className="space-y-3"
              >
                <div className="space-y-1">
                  <Label htmlFor="audit-password">Registrar password</Label>
                  <Input
                    id="audit-password"
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
                  <ShieldCheck
                    className="mt-0.5 size-3.5 shrink-0"
                    aria-hidden
                  />
                  <span>
                    Used once to fetch your transcript and never stored — not
                    saved to your account, not written to our database, and not
                    kept after this request finishes.
                  </span>
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      !canRun ||
                      registrarAudit.isPending ||
                      password.length === 0
                    }
                  >
                    {registrarAudit.isPending && (
                      <Loader2 className="animate-spin" aria-hidden />
                    )}
                    Run audit
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
                    Upload a transcript instead
                  </Button>
                </div>
              </form>
            )}

            {!canRun && (
              <p className="text-xs text-muted-foreground">
                Pick your admission year and at least one major to run an audit.
              </p>
            )}

            {active.isError && (
              <p className="text-sm text-destructive" role="alert">
                {registrarErrorMessage(active.error, "running the audit")}
              </p>
            )}
          </Card>
        )}
      </QueryBoundary>

      {result && <AuditResult audit={result} />}
    </div>
  )
}
