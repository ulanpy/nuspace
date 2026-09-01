import { Loader2 } from "lucide-react"

import {
  buildTransferCreditMappings,
  type TransferCreditMappingRow,
} from "../audit-mapping"
import type { TransferCreditMapping } from "../types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function TransferCreditDialog({
  open,
  rows,
  isPending,
  onRowsChange,
  onSubmit,
  onSkip,
}: {
  open: boolean
  rows: TransferCreditMappingRow[]
  isPending: boolean
  onRowsChange: (rows: TransferCreditMappingRow[]) => void
  onSubmit: (mappings: TransferCreditMapping[]) => void
  onSkip: () => void
}) {
  const validation = buildTransferCreditMappings(rows)

  const updateRow = (
    index: number,
    field: "mappedCode" | "mappedCredits",
    value: string
  ) => {
    onRowsChange(
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isPending) onSkip()
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        showCloseButton={!isPending}
      >
        <DialogHeader>
          <DialogTitle>Match transfer credits</DialogTitle>
          <DialogDescription>
            Map any recognised transfer course to its NU equivalent, then rerun
            the same audit. Leave a row blank to keep it unmatched.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {rows.map((row, index) => (
            <fieldset
              key={row.originalCode}
              className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_8rem]"
            >
              <legend className="sr-only">
                Map transfer course {row.originalCode}
              </legend>
              <div className="self-end">
                <p className="font-medium">{row.originalCode}</p>
                <p className="text-xs text-muted-foreground">{row.title}</p>
                <p className="text-xs text-muted-foreground">
                  {row.originalCredits} original credits
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`mapped-code-${index}`}>NU course code</Label>
                <Input
                  id={`mapped-code-${index}`}
                  value={row.mappedCode}
                  placeholder="e.g. HST 152"
                  autoComplete="off"
                  disabled={isPending}
                  onChange={(event) => {
                    updateRow(index, "mappedCode", event.target.value)
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`mapped-credits-${index}`}>NU credits</Label>
                <Input
                  id={`mapped-credits-${index}`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={row.mappedCredits}
                  disabled={isPending}
                  aria-invalid={Boolean(validation.errors[row.originalCode])}
                  onChange={(event) => {
                    updateRow(index, "mappedCredits", event.target.value)
                  }}
                />
                {validation.errors[row.originalCode] && (
                  <p className="text-xs text-destructive" role="alert">
                    {validation.errors[row.originalCode]}
                  </p>
                )}
              </div>
            </fieldset>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={onSkip}>
            Skip mappings
          </Button>
          <Button
            disabled={
              isPending ||
              validation.mappings.length === 0 ||
              Object.keys(validation.errors).length > 0
            }
            onClick={() => {
              onSubmit(validation.mappings)
            }}
          >
            {isPending && <Loader2 className="animate-spin" aria-hidden />}
            Apply and rerun
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
