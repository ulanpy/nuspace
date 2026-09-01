export type SyllabusLinks = Record<string, string>

export function normalizeCourseCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, " ")
}

export function parseSyllabusLinks(csv: string): SyllabusLinks {
  const links: SyllabusLinks = {}
  for (const line of csv.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue
    // Only the first and last columns matter. Course titles are proper CSV and
    // frequently contain quoted commas, so `line.split(",")` shifts the URL
    // into the middle of the title for hundreds of real courses.
    const firstComma = line.indexOf(",")
    const lastComma = line.lastIndexOf(",")
    if (firstComma < 1 || lastComma <= firstComma) continue
    const codes = line.slice(0, firstComma)
    const url = line.slice(lastComma + 1)
    if (!codes || !url) continue
    for (const code of codes.split("/")) {
      const normalized = normalizeCourseCode(code)
      if (normalized && !links[normalized]) links[normalized] = url.trim()
    }
  }
  return links
}

export function syllabusLink(
  links: SyllabusLinks,
  courseCode: string
): string | undefined {
  return links[normalizeCourseCode(courseCode)]
}
