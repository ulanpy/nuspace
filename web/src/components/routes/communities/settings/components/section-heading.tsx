interface SectionHeadingProps {
  title: string
}

/** A compact section header for a settings page. */
export function SectionHeading({ title }: SectionHeadingProps) {
  return <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
}
