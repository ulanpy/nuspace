import type { TransferCreditCourse, TransferCreditMapping } from "./types"

export interface TransferCreditMappingRow {
  originalCode: string
  title: string
  originalCredits: number
  mappedCode: string
  mappedCredits: string
}

export function transferCreditMappingRows(
  courses: readonly TransferCreditCourse[]
): TransferCreditMappingRow[] {
  return courses.map((course) => ({
    originalCode: course.code,
    title: course.title,
    originalCredits: course.credits,
    mappedCode: "",
    mappedCredits: String(course.credits),
  }))
}

export interface TransferCreditMappingResult {
  mappings: TransferCreditMapping[]
  errors: Record<string, string>
}

export function mergeTransferCreditMappings(
  previous: readonly TransferCreditMapping[],
  next: readonly TransferCreditMapping[]
): TransferCreditMapping[] {
  const byOriginalCode = new Map(
    previous.map((mapping) => [mapping.original_code, mapping])
  )
  for (const mapping of next) {
    byOriginalCode.set(mapping.original_code, mapping)
  }
  return [...byOriginalCode.values()]
}

function normalizeCourseCode(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase()
}

/**
 * Turn editable rows into the backend contract.
 *
 * Blank target codes mean "leave this course unmatched" and are skipped. A
 * typed target must have positive credits; sending zero or NaN would make the
 * rerun look successful while silently contributing nothing to the audit.
 */
export function buildTransferCreditMappings(
  rows: readonly TransferCreditMappingRow[]
): TransferCreditMappingResult {
  const mappings: TransferCreditMapping[] = []
  const errors: Record<string, string> = {}

  for (const row of rows) {
    const mappedCode = normalizeCourseCode(row.mappedCode)
    if (!mappedCode) continue

    const mappedCredits = Number(row.mappedCredits)
    if (!Number.isFinite(mappedCredits) || mappedCredits <= 0) {
      errors[row.originalCode] = "Enter a positive number of credits"
      continue
    }

    mappings.push({
      original_code: normalizeCourseCode(row.originalCode),
      mapped_code: mappedCode,
      mapped_credits: mappedCredits,
    })
  }

  return { mappings, errors }
}
