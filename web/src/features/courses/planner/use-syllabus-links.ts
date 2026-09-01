import { useEffect, useState } from "react"

import {
  parseSyllabusLinks,
  type SyllabusLinks,
} from "@/features/courses/planner/syllabus"

export function useSyllabusLinks() {
  const [links, setLinks] = useState<SyllabusLinks>({})

  useEffect(() => {
    const controller = new AbortController()
    void fetch("/data/course_links.csv", { signal: controller.signal })
      .then((response) => (response.ok ? response.text() : ""))
      .then((text) => {
        if (text) setLinks(parseSyllabusLinks(text))
      })
      .catch(() => {
        // The planner remains fully usable if the optional static map fails.
      })

    return () => {
      controller.abort()
    }
  }, [])

  return links
}
