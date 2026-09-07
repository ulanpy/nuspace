export const LinkButton = {
  fields: {
    title: { type: "text" as const },
    description: { type: "text" as const },
    url: { type: "text" as const },
  },
  defaultProps: {
    title: "Link",
    description: "",
    url: "",
  },
  render: ({
    title,
    description,
    url,
  }: {
    title: string
    description: string
    url: string
  }) => (
    <a
      href={url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="block py-2 transition-colors hover:text-primary"
    >
      <p className="text-lg font-medium">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </a>
  ),
}
