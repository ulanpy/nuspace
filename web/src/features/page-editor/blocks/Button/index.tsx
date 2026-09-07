import type { ComponentConfig } from "@puckeditor/core"

export type ButtonProps = {
  label: string
  href: string
  variant: "primary" | "secondary"
  size: "small" | "large"
}

export const Button: ComponentConfig<ButtonProps> = {
  label: "Button",
  fields: {
    label: {
      type: "text",
      placeholder: "Lorem ipsum...",
      contentEditable: true,
    },
    href: { type: "text" },
    variant: {
      type: "radio",
      options: [
        { label: "primary", value: "primary" },
        { label: "secondary", value: "secondary" },
      ],
    },
    size: {
      type: "radio",
      options: [
        { label: "small", value: "small" },
        { label: "large", value: "large" },
      ],
    },
  },
  defaultProps: {
    label: "Button",
    href: "#",
    variant: "primary",
    size: "large",
  },
  render: ({ href, variant, label, size, puck }) => (
    <div>
      <a
        href={puck.isEditing ? "#" : href}
        className={[
          "inline-flex items-center justify-center rounded-md font-medium",
          size === "large" ? "px-6 py-3 text-base" : "px-4 py-2 text-sm",
          variant === "primary"
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "border border-input bg-background text-foreground hover:bg-accent",
        ].join(" ")}
        tabIndex={puck.isEditing ? -1 : undefined}
      >
        {label}
      </a>
    </div>
  ),
}
