import "react"

// Inline component styles also carry CSS custom properties.
declare module "react" {
  interface CSSProperties {
    [property: `--${string}`]: string | number | undefined
  }
}
