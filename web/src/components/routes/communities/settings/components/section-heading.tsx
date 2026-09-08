interface SectionHeadingProps {
  title: string
  description?: string
}

/** A compact section header for a settings page, with an optional subtitle. */
export function SectionHeading({ title, description }: SectionHeadingProps) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}
