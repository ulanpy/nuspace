import { Bold, Heading, Italic, Link2, List, ListOrdered, Quote } from "lucide-react";
import { Button } from "@/components/atoms/button";

export type FormattingAction =
  | "bold"
  | "italic"
  | "heading"
  | "unordered-list"
  | "ordered-list"
  | "quote";

interface MarkdownToolbarProps {
  onFormat: (action: FormattingAction) => void;
  onInsertLink: () => void;
  disabled?: boolean;
}

const toolbarButtons = [
  {
    action: "bold" as FormattingAction,
    label: "Bold",
    icon: Bold,
  },
  {
    action: "italic" as FormattingAction,
    label: "Italic",
    icon: Italic,
  },
  {
    action: "heading" as FormattingAction,
    label: "Heading",
    icon: Heading,
  },
  {
    action: "unordered-list" as FormattingAction,
    label: "Bulleted list",
    icon: List,
  },
  {
    action: "ordered-list" as FormattingAction,
    label: "Numbered list",
    icon: ListOrdered,
  },
  {
    action: "quote" as FormattingAction,
    label: "Quote",
    icon: Quote,
  },
];

export function MarkdownToolbar({ onFormat, onInsertLink, disabled = false }: MarkdownToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-muted-foreground/40 p-2">
      <div className="flex flex-wrap gap-1">
        {toolbarButtons.map(({ action, label, icon: Icon }) => (
          <Button
            key={action}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={() => onFormat(action)}
            className="h-8 w-8 text-muted-foreground"
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Insert link"
        title="Insert link"
        disabled={disabled}
        onClick={onInsertLink}
        className="text-muted-foreground"
      >
        <Link2 className="mr-1 h-4 w-4" />
        Link
      </Button>
    </div>
  );
}
