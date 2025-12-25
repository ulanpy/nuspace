import { useEffect, useState } from "react";
import { Opportunity, UpsertOpportunityInput } from "../types";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import { Button } from "@/components/atoms/button";

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
    type: "",
    majors: "",
    link: "",
    location: "",
    eligibility: "",
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
        type: initial.type || "",
        majors: initial.majors || "",
        link: initial.link || "",
        location: initial.location || "",
        eligibility: initial.eligibility || "",
        funding: initial.funding || "",
      });
    } else {
      setForm((prev) => ({ ...prev, name: "" }));
    }
  }, [initial]);

  const handleChange = (key: keyof UpsertOpportunityInput, value: string) => {
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
        <Input
          id="type"
          value={form.type || ""}
          onChange={(e) => handleChange("type", e.target.value)}
          placeholder="Internship, Fellowship..."
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
