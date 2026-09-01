import { useEffect, useId, useRef, useState } from "react"
import {
  BoldIcon,
  HeadingIcon,
  ItalicIcon,
  Link2Icon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type FormattingAction =
  "bold" | "italic" | "heading" | "unordered-list" | "ordered-list" | "quote"

interface MarkdownToolbarProps {
  /** The textarea being edited. Selection is read straight off it. */
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (next: string) => void
  disabled?: boolean
}

const ACTIONS: {
  action: FormattingAction
  label: string
  icon: typeof BoldIcon
}[] = [
  { action: "bold", label: "Bold", icon: BoldIcon },
  { action: "italic", label: "Italic", icon: ItalicIcon },
  { action: "heading", label: "Heading", icon: HeadingIcon },
  { action: "unordered-list", label: "Bulleted list", icon: ListIcon },
  { action: "ordered-list", label: "Numbered list", icon: ListOrderedIcon },
  { action: "quote", label: "Quote", icon: QuoteIcon },
]

/** What a button inserts when nothing is selected, so a click is never a no-op. */
const PLACEHOLDER = "text"

/**
 * Markdown formatting controls for a plain textarea.
 *
 * The old app split this the wrong way: the toolbar rendered buttons and
 * emitted an action name, leaving every caller to write its own copy of the
 * ~55 lines that turn a selection into markdown. Event description, community
 * description and the opportunity form each had one, and they had already
 * drifted. Here the toolbar owns the transformation and the caller owns the
 * value, which is the split that actually deduplicates.
 *
 * Two behaviours differ from the original on purpose:
 *
 * - With nothing selected the old handler returned early, so clicking **B** on
 *   an empty textarea did nothing at all with no explanation. This inserts a
 *   selected placeholder instead.
 * - Links were collected with two stacked `window.prompt` calls. This uses an
 *   inline row, which can be cancelled, styled, and read by a screen reader.
 */
export function MarkdownToolbar({
  textareaRef,
  value,
  onChange,
  disabled = false,
}: MarkdownToolbarProps) {
  const fieldId = useId()
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkText, setLinkText] = useState("")
  const [linkHref, setLinkHref] = useState("https://")

  /**
   * Where the caret should sit once the new value has been rendered. The
   * textarea is controlled by the parent, so setting selection synchronously
   * would be overwritten by React's re-render — this waits for `value` to come
   * back changed and only then restores it.
   */
  const pendingSelection = useRef<[number, number] | null>(null)
  useEffect(() => {
    const selection = pendingSelection.current
    if (!selection) return
    pendingSelection.current = null

    const textarea = textareaRef.current
    if (!textarea) return
    textarea.focus()
    textarea.setSelectionRange(selection[0], selection[1])
  }, [value, textareaRef])

  const replaceSelection = (
    replacement: string,
    /** Selection within `replacement`, relative to its start. */
    select: [number, number]
  ) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const { selectionStart, selectionEnd } = textarea
    const next =
      value.slice(0, selectionStart) + replacement + value.slice(selectionEnd)

    pendingSelection.current = [
      selectionStart + select[0],
      selectionStart + select[1],
    ]
    onChange(next)
  }

  const applyFormatting = (action: FormattingAction) => {
    const textarea = textareaRef.current
    if (!textarea || disabled) return

    const { selectionStart, selectionEnd } = textarea
    const selected = value.slice(selectionStart, selectionEnd)
    const body = selected === "" ? PLACEHOLDER : selected

    const wrap = (marker: string): [string, [number, number]] => [
      `${marker}${body}${marker}`,
      [marker.length, marker.length + body.length],
    ]

    // Line-oriented markers apply to every selected line, so the whole result
    // stays selected rather than trying to guess a caret position inside it.
    const perLine = (
      format: (line: string, index: number) => string
    ): [string, [number, number]] => {
      const replacement = body
        .split(/\r?\n/)
        .map((line, index) => format(line, index))
        .join("\n")
      return [replacement, [0, replacement.length]]
    }

    const formatted: Record<
      FormattingAction,
      () => [string, [number, number]]
    > = {
      bold: () => wrap("**"),
      italic: () => wrap("_"),
      heading: () => perLine((line) => `## ${line}`),
      "unordered-list": () => perLine((line) => `- ${line}`),
      "ordered-list": () =>
        perLine((line, index) => `${String(index + 1)}. ${line}`),
      quote: () => perLine((line) => `> ${line}`),
    }

    const [replacement, select] = formatted[action]()
    replaceSelection(replacement, select)
  }

  const openLinkRow = () => {
    const textarea = textareaRef.current
    if (!textarea || disabled) return
    setLinkText(value.slice(textarea.selectionStart, textarea.selectionEnd))
    setLinkHref("https://")
    setLinkOpen(true)
  }

  const insertLink = () => {
    const href = linkHref.trim()
    if (href === "" || href === "https://") return

    const label = linkText.trim() === "" ? href : linkText.trim()
    const markdown = `[${label}](${href})`
    replaceSelection(markdown, [markdown.length, markdown.length])
    setLinkOpen(false)
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-muted-foreground/40 p-2">
      <div className="flex flex-wrap items-center gap-1">
        {ACTIONS.map(({ action, label, icon: Icon }) => (
          <Button
            key={action}
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={() => {
              applyFormatting(action)
            }}
            className="text-muted-foreground"
          >
            <Icon aria-hidden />
          </Button>
        ))}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          aria-expanded={linkOpen}
          onClick={() => {
            if (linkOpen) setLinkOpen(false)
            else openLinkRow()
          }}
          className="text-muted-foreground"
        >
          <Link2Icon aria-hidden />
          Link
        </Button>
      </div>

      {linkOpen && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-32 flex-1 space-y-1">
            <Label htmlFor={`${fieldId}-text`} className="text-xs">
              Text
            </Label>
            <Input
              id={`${fieldId}-text`}
              value={linkText}
              placeholder="Read the rules"
              onChange={(event) => {
                setLinkText(event.target.value)
              }}
            />
          </div>
          <div className="min-w-40 flex-2 space-y-1">
            <Label htmlFor={`${fieldId}-href`} className="text-xs">
              URL
            </Label>
            <Input
              id={`${fieldId}-href`}
              value={linkHref}
              inputMode="url"
              placeholder="https://example.com"
              onChange={(event) => {
                setLinkHref(event.target.value)
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return
                // The toolbar sits inside the entity form; Enter here must not
                // submit it.
                event.preventDefault()
                insertLink()
              }}
            />
          </div>
          <Button type="button" size="sm" onClick={insertLink}>
            Insert
          </Button>
        </div>
      )}
    </div>
  )
}
