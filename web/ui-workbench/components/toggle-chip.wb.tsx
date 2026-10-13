import { useState } from "react"

import { ToggleChip } from "@/components/shared/toggle-chip"

const TERMS = ["Fall", "Spring", "Summer"]

export default function ToggleChipDemo() {
  const [active, setActive] = useState<readonly string[]>(["Fall"])

  return (
    <div className="flex flex-wrap items-center gap-2">
      {TERMS.map((term) => (
        <ToggleChip
          key={term}
          label={term}
          isActive={active.includes(term)}
          onClick={() =>
            setActive((prev) =>
              prev.includes(term)
                ? prev.filter((item) => item !== term)
                : [...prev, term]
            )
          }
        />
      ))}
    </div>
  )
}
