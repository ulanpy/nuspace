import { useState } from "react"

import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

export default function FormControlsDemo() {
  const [notify, setNotify] = useState(false)

  return (
    <div className="max-w-sm space-y-4">
      <div className="space-y-2">
        <label htmlFor="demo-email" className="text-sm font-medium">
          Email
        </label>
        <Input id="demo-email" placeholder="you@nu.edu.kz" />
      </div>
      <div className="space-y-2">
        <label htmlFor="demo-note" className="text-sm font-medium">
          Note
        </label>
        <Textarea id="demo-note" placeholder="Anything else?" />
      </div>
      <div className="flex items-center gap-2">
        <Switch id="demo-notify" checked={notify} onCheckedChange={setNotify} />
        <label htmlFor="demo-notify" className="text-sm">
          Notify me by email
        </label>
      </div>
    </div>
  )
}
