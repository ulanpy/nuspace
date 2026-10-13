import { Button } from "@/components/ui/button"

const VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
] as const

const SIZES = ["xs", "sm", "default", "lg"] as const

export default function ButtonDemo() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {VARIANTS.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {SIZES.map((size) => (
          <Button key={size} size={size}>
            {size}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button>Default</Button>
        <Button disabled>Disabled</Button>
        <Button aria-invalid>Invalid</Button>
      </div>
    </div>
  )
}
