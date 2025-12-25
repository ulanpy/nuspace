import { useEffect, useState } from "react";
import {
  Opportunity,
  OpportunityType,
  OPPORTUNITY_TYPES,
  UpsertOpportunityInput,
  formatOpportunityType,
  EDUCATION_LEVELS,
  EducationLevel,
} from "../types";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import { Button } from "@/components/atoms/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select";

type Props = {
  initial?: Opportunity | null;
  onSubmit: (payload: UpsertOpportunityInput) => void;
  onCancel: () => void;
};

export const OpportunityForm = ({ initial, onSubmit, onCancel }: Props) => {
  const [form, setForm] = useState<UpsertOpportunityInput>({
    name: "",
    description: "",
    deadline: "",
    steps: "",
    host: "",
    type: OPPORTUNITY_TYPES[0],
    majors: "",
    link: "",
    location: "",
    eligibility: [],
    funding: "",
  });

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || "",
        description: initial.description || "",
        deadline: initial.deadline || "",
        steps: initial.steps || "",
        host: initial.host || "",
        type: initial.type || OPPORTUNITY_TYPES[0],
        majors: initial.majors || "",
        link: initial.link || "",
        location: initial.location || "",
        eligibility: initial.eligibility || [],
        funding: initial.funding || "",
      });
    } else {
      setForm((prev) => ({ ...prev, name: "", type: OPPORTUNITY_TYPES[0], eligibility: [] }));
    }
  }, [initial]);

  const handleChange = (key: keyof UpsertOpportunityInput, value: string | OpportunityType) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
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
        <Label htmlFor="type">Type</Label>
        <Select
          value={form.type}
          onValueChange={(v) => handleChange("type", v as OpportunityType)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {OPPORTUNITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {formatOpportunityType(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <div>
          <Label htmlFor="deadline">Deadline</Label>
          <Input
            id="deadline"
            type="date"
            value={form.deadline ? form.deadline.slice(0, 10) : ""}
            onChange={(e) => handleChange("deadline", e.target.value)}
          />
          <p className="text-xs text-gray-500">Leave empty for Year-round</p>
        </div>
        <div>
          <Label htmlFor="majors">Majors</Label>
          <Input
            id="majors"
            value={form.majors || ""}
            onChange={(e) => handleChange("majors", e.target.value)}
            placeholder="CS; EE"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={form.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="steps">Steps</Label>
          <Input
            id="steps"
            value={form.steps || ""}
            onChange={(e) => handleChange("steps", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="eligibility">Eligibility</Label>
          <Input
            id="eligibility"
            value={form.eligibility || ""}
            onChange={(e) => handleChange("eligibility", e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Eligibility</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                eligibility: [
                  ...(prev.eligibility || []),
                  { education_level: EDUCATION_LEVELS[0], min_year: null, max_year: null },
                ],
              }))
            }
          >
            Add
          </Button>
        </div>
        {(form.eligibility || []).length === 0 && (
          <p className="text-xs text-gray-500">No eligibility added.</p>
        )}
        {(form.eligibility || []).map((item, idx) => (
          <div
            key={idx}
            className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end rounded-lg border border-border/60 p-3"
          >
            <div>
              <Label className="text-xs text-gray-500">Education level</Label>
              <Select
                value={item.education_level}
                onValueChange={(v) =>
                  setForm((prev) => {
                    const next = [...(prev.eligibility || [])];
                    next[idx] = { ...next[idx], education_level: v as EducationLevel };
                    if (v === "PhD") {
                      next[idx].min_year = null;
                      next[idx].max_year = null;
                    }
                    return { ...prev, eligibility: next };
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((lvl) => (
                    <SelectItem key={lvl} value={lvl}>
                      {lvl === "UG" ? "Undergraduate" : lvl === "GrM" ? "Master" : "PhD"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Min year</Label>
              <Input
                type="number"
                min={1}
                max={item.education_level === "UG" ? 4 : item.education_level === "GrM" ? 2 : undefined}
                value={item.min_year ?? ""}
                onChange={(e) =>
                  setForm((prev) => {
                    const next = [...(prev.eligibility || [])];
                    next[idx] = { ...next[idx], min_year: e.target.value ? Number(e.target.value) : null };
                    return { ...prev, eligibility: next };
                  })
                }
                disabled={item.education_level === "PhD"}
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs text-gray-500">Max year</Label>
                <Input
                  type="number"
                  min={1}
                  max={item.education_level === "UG" ? 4 : item.education_level === "GrM" ? 2 : undefined}
                  value={item.max_year ?? ""}
                  onChange={(e) =>
                    setForm((prev) => {
                      const next = [...(prev.eligibility || [])];
                      next[idx] = { ...next[idx], max_year: e.target.value ? Number(e.target.value) : null };
                      return { ...prev, eligibility: next };
                    })
                  }
                  disabled={item.education_level === "PhD"}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    eligibility: (prev.eligibility || []).filter((_, i) => i !== idx),
                  }))
                }
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
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
