import { useEffect, useRef, useState } from "react";
import {
  Opportunity,
  OPPORTUNITY_TYPES,
  OPPORTUNITY_MAJORS,
  UpsertOpportunityInput,
  EDUCATION_LEVELS,
  EducationLevel,
} from "../types";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import { Button } from "@/components/atoms/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/atoms/popover";
import { Textarea } from "@/components/atoms/textarea";
import { MarkdownToolbar, type FormattingAction } from "@/components/molecules/MarkdownToolbar";

const MAX_DESCRIPTION_LENGTH = 1250;

type OptionItem = { label: string; value: string };

const MultiCheckboxDropdown = ({
  label,
  options,
  selected,
  onChange,
  placeholder = "All",
}: {
  label?: string;
  options: OptionItem[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) => {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const allSelected = selected.length === options.length;
  const display =
    selected.length === 0
      ? placeholder
      : selected.length === options.length
        ? "All"
        : `${selected.length} selected`;

  return (
    <div className="flex h-full flex-col justify-end gap-1">
      {label ? <Label className="text-xs text-gray-500">{label}</Label> : null}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between h-11">
            <span className="truncate text-left">{display}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-2">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Select</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={() => onChange(allSelected ? [] : options.map((o) => o.value))}
            >
              {allSelected ? "Clear all" : "Select all"}
            </Button>
          </div>
          <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
            {options.map((opt) => {
              const active = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className="flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-1 text-left text-sm hover:border-border/60 hover:bg-muted/40"
                >
                  <span
                    className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm border text-[10px] leading-none ${active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}
                  >
                    {active ? "✓" : ""}
                  </span>
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

type Props = {
  initial?: Opportunity | null;
  onSubmit: (payload: UpsertOpportunityInput) => void;
  onCancel: () => void;
};

export const OpportunityForm = ({ initial, onSubmit, onCancel }: Props) => {
  const typeOptions = OPPORTUNITY_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, " ") }));
  const majorOptions = OPPORTUNITY_MAJORS.map((m) => ({ value: m, label: m }));
  const levelOptions = EDUCATION_LEVELS.map((lvl) => ({
    value: lvl,
    label: lvl === "UG" ? "Undergraduate" : lvl === "GrM" ? "Master" : "PhD",
  }));
  const yearOptions = [1, 2, 3, 4].map((y) => ({ value: String(y), label: `Year ${y}` }));

  const [form, setForm] = useState<UpsertOpportunityInput>({
    name: "",
    description: "",
    host: "",
    link: "",
    location: "",
    funding: "",
  });

  const [selectedTypes, setSelectedTypes] = useState<string[]>([OPPORTUNITY_TYPES[0]]);
  const [selectedMajors, setSelectedMajors] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || "",
        description: initial.description || "",
        host: initial.host || "",
        link: initial.link || "",
        location: initial.location || "",
        funding: initial.funding || "",
      });
      setSelectedTypes(initial.type ? (Array.isArray(initial.type) ? initial.type : [initial.type]) : [OPPORTUNITY_TYPES[0]]);
      setSelectedMajors(Array.isArray(initial.majors) ? initial.majors : []);
      setSelectedLevels(initial.eligibility?.map((e) => e.education_level) || []);
      setSelectedYears(
        initial.eligibility?.flatMap((e) =>
          typeof (e as any).year === "number" ? [String((e as any).year)] : []
        ) || []
      );
    } else {
      setForm((prev) => ({
        ...prev,
        name: "",
      }));
      setSelectedTypes([]);
      setSelectedMajors([]);
      setSelectedLevels([]);
      setSelectedYears([]);
    }
  }, [initial]);

  const handleChange = (key: keyof UpsertOpportunityInput, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleMajor = (value: OpportunityMajor) => {
    setForm((prev) => {
      const current = Array.isArray(prev.majors) ? prev.majors : [];
      const exists = current.includes(value);
      const next = exists ? current.filter((m) => m !== value) : [...current, value];
      return { ...prev, majors: next };
    });
  };

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const updateDescription = (nextValue: string, selectionStart?: number, selectionEnd?: number) => {
    setForm((prev) => ({
      ...prev,
      description: nextValue.slice(0, MAX_DESCRIPTION_LENGTH),
    }));

    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      if (typeof selectionStart === "number" && typeof selectionEnd === "number") {
        textareaRef.current.setSelectionRange(selectionStart, selectionEnd);
      }
      textareaRef.current.focus();
    });
  };

  const applyFormatting = (action: FormattingAction) => {
    if (!textareaRef.current) return;
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
      replacement = lines.map((line, index) => formatter(line, index)).join("\n");
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

    const nextValue = value.slice(0, selectionStart) + replacement + value.slice(selectionEnd);
    const nextSelectionStart = selectionStart + selectionOffsetStart;
    const nextSelectionEnd = nextSelectionStart + selectionLength;

    updateDescription(nextValue, nextSelectionStart, nextSelectionEnd);
  };

  const handleInsertLink = () => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const { selectionStart, selectionEnd, value } = textarea;
    const selectedText = value.slice(selectionStart, selectionEnd);

    const linkLabel = selectedText || window.prompt("Link text", "Opportunity link") || "Opportunity link";
    const href = window.prompt("URL (include https://)", "https://");

    if (!href) return;

    const linkMarkdown = `[${linkLabel}](${href})`;
    const nextValue = value.slice(0, selectionStart) + linkMarkdown + value.slice(selectionEnd);
    const nextSelectionStart = selectionStart + linkMarkdown.length;

    updateDescription(nextValue, nextSelectionStart, nextSelectionStart);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const yearValue =
      selectedYears.length > 0 ? Number(selectedYears[selectedYears.length - 1]) : null;

    const eligibility =
      selectedLevels.length > 0
        ? selectedLevels.map((lvl) => ({
            education_level: lvl as EducationLevel,
            year: yearValue,
          }))
        : [];

    onSubmit({
      ...form,
      type: selectedTypes[0] || OPPORTUNITY_TYPES[0],
      majors: selectedMajors,
      eligibility,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={form.name || ""}
          onChange={(e) => handleChange("name", e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="host">Host</Label>
        <Input
          id="host"
          value={form.host || ""}
          onChange={(e) => handleChange("host", e.target.value)}
          placeholder="Organization"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <MultiCheckboxDropdown
          label="Type"
          options={typeOptions}
          selected={selectedTypes}
          onChange={(next) => setSelectedTypes(next.slice(-1))} // single select behavior
        />
        <MultiCheckboxDropdown
          label="Majors"
          options={majorOptions}
          selected={selectedMajors}
          onChange={setSelectedMajors}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <MultiCheckboxDropdown
          label="Education level"
          options={levelOptions}
          selected={selectedLevels}
          onChange={setSelectedLevels}
        />
        <MultiCheckboxDropdown
          label="Year"
          options={yearOptions}
          selected={selectedYears}
          onChange={(next) => setSelectedYears(next.slice(-1))} // single select behavior
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {form.description?.length ?? 0} / {MAX_DESCRIPTION_LENGTH}
          </span>
        </div>
        <MarkdownToolbar onFormat={applyFormatting} onInsertLink={handleInsertLink} />
        <Textarea
          ref={textareaRef}
          id="description"
          value={form.description || ""}
          onChange={(e) => updateDescription(e.target.value)}
          placeholder="Describe the opportunity, benefits, selection steps, etc."
          className="min-h-[120px]"
          maxLength={MAX_DESCRIPTION_LENGTH}
          required
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="funding">Funding</Label>
          <Input
            id="funding"
            value={form.funding || ""}
            onChange={(e) => handleChange("funding", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={form.location || ""}
            onChange={(e) => handleChange("location", e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="link">Link</Label>
        <Input
          id="link"
          value={form.link || ""}
          onChange={(e) => handleChange("link", e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initial ? "Save" : "Create"}</Button>
      </div>
    </form>
  );
};
