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
 * Mirrors the Puck demo's `Section`: a wrapper with horizontal page padding
 * and a centered, max-width inner container.
 */
export const Section = forwardRef<HTMLDivElement, SectionProps>(
  ({ children, className, maxWidth = "1280px", style, nested }, ref) => (
    <div
      ref={ref}
      className={["w-full", nested ? "" : "px-4 md:px-5", className]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      <div className="mx-auto h-full w-full" style={{ maxWidth }}>
        {children}
      </div>
    </div>
  )
)

Section.displayName = "Section"
