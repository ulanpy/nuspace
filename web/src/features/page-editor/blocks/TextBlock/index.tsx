export const TextBlock = {
  fields: {
    body: { type: "richtext" as const },
  },
  defaultProps: {
    body: "<p>Text</p>",
  },
  render: ({ body }: { body: string }) => <>{body}</>,
}
