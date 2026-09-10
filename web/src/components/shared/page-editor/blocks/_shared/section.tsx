import { forwardRef, type CSSProperties, type ReactNode } from "react"

export type SectionProps = {
  className?: string
  children: ReactNode
  maxWidth?: string
  style?: CSSProperties
  /** Innermost sections used inside Grid/Flex don't need page padding. */
  nested?: boolean
}

/**
 * Mirrors the Puck demo's `Section`: a centered, max-width inner container.
 * Horizontal page padding is owned by each block's Layout section, so this
 * wrapper does not add any itself.
 */
export const Section = forwardRef<HTMLDivElement, SectionProps>(
  ({ children, className, maxWidth = "1280px", style }, ref) => (
    <div
      ref={ref}
      className={["w-full", className].filter(Boolean).join(" ")}
      style={style}
    >
      <div className="mx-auto size-full" style={{ maxWidth }}>
        {children}
      </div>
    </div>
  )
)

Section.displayName = "Section"
