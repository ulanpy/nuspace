import { useCallback, useEffect, useRef, useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { FileUp, Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import {
  auditCatalogQueryOptions,
  cachedAuditQueryOptions,
  useRegistrarAudit,
  useTranscriptAudit,
} from "@/features/courses/api"
import { AuditResult } from "@/features/courses/components/audit-result"
import { TransferCreditDialog } from "@/features/courses/components/transfer-credit-dialog"
import {
  mergeTransferCreditMappings,
  transferCreditMappingRows,
} from "@/features/courses/audit-mapping"
import { registrarErrorMessage } from "@/features/courses/registrar-errors"
import type {
  AuditResponse,
  TransferCreditMapping,
} from "@/features/courses/types"
import type { TransferCreditMappingRow } from "@/features/courses/audit-mapping"
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

interface AuditSelection {
  year: string
  majors: string[]
  minors: string[]
}

type PendingAuditInput =
  | {
      mode: "registrar"
      selection: AuditSelection
      password: string
      tcMappings: TransferCreditMapping[]
    }
  | {
      mode: "pdf"
      selection: AuditSelection
      file: File
      tcMappings: TransferCreditMapping[]
    }

function sameValues(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length && left.every((value) => right.includes(value))
  )
}

function DegreeAudit() {
  const { year, majors = [], minors = [] } = Route.useSearch()
  const navigate = Route.useNavigate()

  const [password, setPassword] = useState("")
  const [usePdf, setUsePdf] = useState(false)
  const [auditError, setAuditError] = useState<unknown>(null)
  const [latestResult, setLatestResult] = useState<AuditResponse | null>(null)
  const [mappingRows, setMappingRows] = useState<TransferCreditMappingRow[]>([])
  const [mappingOpen, setMappingOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingAudit = useRef<PendingAuditInput | null>(null)

  const catalog = useQuery(auditCatalogQueryOptions())
  const cached = useQuery(cachedAuditQueryOptions(year, majors[0]))

  const registrarAudit = useRegistrarAudit()
  const transcriptAudit = useTranscriptAudit()
  const resetRegistrarAudit = registrarAudit.reset
  const resetTranscriptAudit = transcriptAudit.reset

  const resetSensitiveMutationState = useCallback(() => {
    // React Query otherwise retains the last mutation variables after settle;
    // those variables include the password or transcript File.
    resetRegistrarAudit()
    resetTranscriptAudit()
  }, [resetRegistrarAudit, resetTranscriptAudit])
  const resetSensitiveMutationStateRef = useRef(resetSensitiveMutationState)
  resetSensitiveMutationStateRef.current = resetSensitiveMutationState

  const clearSensitiveAuditInput = useCallback(() => {
    pendingAudit.current = null
    setPassword("")
    if (fileRef.current) fileRef.current.value = ""
    resetSensitiveMutationState()
  }, [resetSensitiveMutationState])

  useEffect(
    () => () => {
      // A mapping prompt may still hold a registrar password or PDF for its
      // rerun. Component teardown is a terminal path too.
      pendingAudit.current = null
      if (fileRef.current) fileRef.current.value = ""
      resetSensitiveMutationStateRef.current()
    },
    []
  )

  const years = catalog.data?.years ?? []
  const activeYear = years.find((entry) => entry.year === year)?.year
  const availableMajors = activeYear
    ? (years.find((entry) => entry.year === activeYear)?.majors ?? [])
    : []
  const availableMinors = catalog.data?.minors ?? []

  const canRun = Boolean(activeYear) && majors.length > 0

  const latestMatchesSelection =
    latestResult !== null &&
    latestResult.year === activeYear &&
    sameValues(latestResult.majors, majors) &&
    sameValues(latestResult.minors, minors)
  // A freshly run audit wins only while the URL still describes that result.
  const result =
    latestMatchesSelection && latestResult
      ? latestResult
      : (cached.data ?? undefined)

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

  const handleAuditSuccess = useCallback(
    (response: AuditResponse, input: PendingAuditInput) => {
      setLatestResult(response)
      setAuditError(null)
      resetSensitiveMutationState()

      if (response.unmapped_tc_courses.length > 0) {
        // Retain only what is required for the user-requested rerun. It never
        // enters browser storage and is cleared on every exit from the prompt.
        pendingAudit.current = input
        setMappingRows(transferCreditMappingRows(response.unmapped_tc_courses))
        setMappingOpen(true)
        setPassword("")
        return
      }

      setMappingOpen(false)
      clearSensitiveAuditInput()
    },
    [clearSensitiveAuditInput, resetSensitiveMutationState]
  )

  const handleAuditFailure = useCallback(
    (error: unknown) => {
      setAuditError(error)
      setMappingOpen(false)
      clearSensitiveAuditInput()
    },
    [clearSensitiveAuditInput]
  )

  const rerunWithMappings = (tcMappings: TransferCreditMapping[]) => {
    const input = pendingAudit.current
    if (!input) {
      setMappingOpen(false)
      toast.error("The audit input has expired. Run the audit again.")
      return
    }
    const combinedMappings = mergeTransferCreditMappings(
      input.tcMappings,
      tcMappings
    )
    const nextInput: PendingAuditInput = {
      ...input,
      tcMappings: combinedMappings,
    }
    setAuditError(null)
    resetSensitiveMutationState()

    const callbacks = {
      onSuccess: (response: AuditResponse) => {
        handleAuditSuccess(response, nextInput)
        if (response.unmapped_tc_courses.length === 0) {
          toast.success("Transfer credits applied")
        } else {
          toast.warning("Some transfer credits are still unmatched")
        }
      },
      onError: (error: unknown) => {
        handleAuditFailure(error)
      },
    }

    if (nextInput.mode === "registrar") {
      registrarAudit.mutate(
        {
          ...nextInput.selection,
          password: nextInput.password,
          tcMappings: combinedMappings,
        },
        callbacks
      )
    } else {
      transcriptAudit.mutate(
        {
          ...nextInput.selection,
          file: nextInput.file,
          tcMappings: combinedMappings,
        },
        callbacks
      )
    }
  }

  return (
    <div className="space-y-4">
      <QueryBoundary query={catalog}>
        {() => (
          <Card className="space-y-5 p-4 sm:p-5">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Programme progress
              </p>
              <h2 className="text-lg font-semibold">Run a degree audit</h2>
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
                  if (!file) return

                  clearSensitiveAuditInput()
                  setAuditError(null)
                  const input: PendingAuditInput = {
                    mode: "pdf",
                    selection,
                    file,
                    tcMappings: [],
                  }
                  transcriptAudit.mutate(
                    { ...selection, file },
                    {
                      onSuccess: (response) => {
                        handleAuditSuccess(response, input)
                      },
                      onError: handleAuditFailure,
                    }
                  )
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
                      clearSensitiveAuditInput()
                      setAuditError(null)
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
                  const input: PendingAuditInput = {
                    mode: "registrar",
                    selection,
                    password,
                    tcMappings: [],
                  }
                  setAuditError(null)
                  resetSensitiveMutationState()
                  setPassword("")
                  pendingAudit.current = null
                  registrarAudit.mutate(
                    { ...selection, password: input.password },
                    {
                      onSuccess: (response) => {
                        handleAuditSuccess(response, input)
                      },
                      onError: handleAuditFailure,
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
                    written to browser storage. If transfer credits need
                    matching, it stays only in this page's memory for that rerun
                    and is cleared when you finish, skip, cancel, hit an error,
                    or leave the page.
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
                      clearSensitiveAuditInput()
                      setAuditError(null)
                      setUsePdf(true)
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

            {auditError !== null && (
              <p className="text-sm text-destructive" role="alert">
                {registrarErrorMessage(auditError, "running the audit")}
              </p>
            )}
          </Card>
        )}
      </QueryBoundary>

      {result && <AuditResult audit={result} />}

      <TransferCreditDialog
        open={mappingOpen}
        rows={mappingRows}
        isPending={registrarAudit.isPending || transcriptAudit.isPending}
        onRowsChange={setMappingRows}
        onSubmit={rerunWithMappings}
        onSkip={() => {
          setMappingOpen(false)
          clearSensitiveAuditInput()
        }}
      />
    </div>
  )
}
