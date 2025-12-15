import { useRef } from "react";
import { useCommunityForm } from "@/context/CommunityFormContext";
import { Label } from "@/components/atoms/label";
import { Textarea } from "@/components/atoms/textarea";
import { MarkdownToolbar, type FormattingAction } from "@/components/molecules/MarkdownToolbar";

const MAX_DESCRIPTION_LENGTH = 1000;

export function CommunityDescription() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { formData, setFormData, handleInputChange, isFieldEditable } = useCommunityForm();
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
      window.prompt("Link text", "Community link") ||
      "Community link";
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="description">
          Description <span className="text-red-500">*</span>
        </Label>
        <span className="text-xs text-gray-500">
          {(formData.description || "").length} / {MAX_DESCRIPTION_LENGTH}
        </span>
      </div>

      <MarkdownToolbar
        onFormat={applyFormatting}
        onInsertLink={handleInsertLink}
        disabled={!isEditable}
      />

      <Textarea
        ref={textareaRef}
        id="description"
        name="description"
        value={formData.description}
        onChange={handleInputChange}
        disabled={!isEditable}
        required
        rows={4}
        maxLength={MAX_DESCRIPTION_LENGTH}
        placeholder="Enter community description"
      />
      <p className="text-xs text-muted-foreground">
        Use the toolbar to apply Markdown formatting. Links open in a new tab on the community page.
      </p>
    </div>
  );
}

