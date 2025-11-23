import { useRef } from "react";
import { Bold, Heading, Italic, Link2, List, ListOrdered, Quote } from "lucide-react";
import { Label } from "@/components/atoms/label";
import { Textarea } from "@/components/atoms/textarea";
import { Button } from "@/components/atoms/button";
import { useEventForm } from "@/context/EventFormContext";

type FormattingAction =
  | "bold"
  | "italic"
  | "heading"
  | "unordered-list"
  | "ordered-list"
  | "quote";

const MAX_DESCRIPTION_LENGTH = 1250;

export function EventDescription() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { formData, setFormData, handleInputChange, isFieldEditable } = useEventForm();
  const isEditable = isFieldEditable("description");

  const updateDescription = (
    nextValue: string,
    selectionStart?: number,
    selectionEnd?: number
  ) => {
    setFormData({
      ...formData,
      description: nextValue.slice(0, MAX_DESCRIPTION_LENGTH),
    });

    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      if (typeof selectionStart === "number" && typeof selectionEnd === "number") {
        textareaRef.current.setSelectionRange(selectionStart, selectionEnd);
      }
      textareaRef.current.focus();
    });
  };

  const applyFormatting = (action: FormattingAction) => {
    if (!textareaRef.current || !isEditable) return;
    const textarea = textareaRef.current;
    const { selectionStart, selectionEnd, value } = textarea;
    if (selectionStart === selectionEnd) return;
    const selectedText = value.slice(selectionStart, selectionEnd);
    let replacement = "";
    let selectionOffsetStart = 0;
    let selectionLength = 0;

    const wrapText = (prefix: string, suffix: string) => {
      replacement = `${prefix}${selectedText}${suffix}`;
      selectionOffsetStart = prefix.length;
      selectionLength = selectedText.length;
    };

    const formatLines = (formatter: (line: string, index: number) => string) => {
      const lines = selectedText.split(/\r?\n/);
      replacement = lines
        .map((line, index) => formatter(line, index))
        .join("\n");
      selectionOffsetStart = 0;
      selectionLength = replacement.length;
    };

    switch (action) {
      case "bold":
        wrapText("**", "**");
        break;
      case "italic":
        wrapText("_", "_");
        break;
      case "heading":
        formatLines((line) => `## ${line}`);
        break;
      case "unordered-list":
        formatLines((line) => `- ${line}`);
        break;
      case "ordered-list":
        formatLines((line, index) => `${index + 1}. ${line}`);
        break;
      case "quote":
        formatLines((line) => `> ${line}`);
        break;
      default:
        return;
    }

    const nextValue =
      value.slice(0, selectionStart) + replacement + value.slice(selectionEnd);

    const nextSelectionStart = selectionStart + selectionOffsetStart;
    const nextSelectionEnd = nextSelectionStart + selectionLength;

    updateDescription(nextValue, nextSelectionStart, nextSelectionEnd);
  };

  const handleInsertLink = () => {
    if (!textareaRef.current || !isEditable) return;
    const textarea = textareaRef.current;
    const { selectionStart, selectionEnd, value } = textarea;
    const selectedText = value.slice(selectionStart, selectionEnd);

    const linkLabel =
      selectedText ||
      window.prompt("Link text", "Event link") ||
      "Event link";
    const href = window.prompt("URL (include https://)", "https://");

    if (!href) return;

    const linkMarkdown = `[${linkLabel}](${href})`;
    const nextValue =
      value.slice(0, selectionStart) +
      linkMarkdown +
      value.slice(selectionEnd);

    const nextSelectionStart = selectionStart + linkMarkdown.length;

    updateDescription(nextValue, nextSelectionStart, nextSelectionStart);
  };

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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="description">Description</Label>
        <span className="text-xs text-gray-500">
          {formData.description?.length} / {MAX_DESCRIPTION_LENGTH}
        </span>
      </div>

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
              disabled={!isEditable}
              onClick={() => applyFormatting(action)}
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
          disabled={!isEditable}
          onClick={handleInsertLink}
          className="text-muted-foreground"
        >
          <Link2 className="mr-1 h-4 w-4" />
          Link
        </Button>
      </div>

      <Textarea
        ref={textareaRef}
        id="description"
        name="description"
        value={formData.description || ""}
        disabled={!isEditable}
        onChange={handleInputChange}
        placeholder="Enter event description"
        className="min-h-[120px]"
        maxLength={MAX_DESCRIPTION_LENGTH}
        required
      />
      <p className="text-xs text-muted-foreground">
        Use the toolbar to apply Markdown formatting. Links open in a new tab on the event page.
      </p>
    </div>
  );
}