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
    opp_name: "",
    opp_description: "",
    opp_deadline: "",
    opp_steps: "",
    opp_host: "",
    opp_type: "",
    opp_majors: "",
    opp_link: "",
    opp_location: "",
    opp_eligibility: "",
    opp_funding: "",
  });

  useEffect(() => {
    if (initial) {
      setForm({
        opp_name: initial.opp_name || "",
        opp_description: initial.opp_description || "",
        opp_deadline: initial.opp_deadline || "",
        opp_steps: initial.opp_steps || "",
        opp_host: initial.opp_host || "",
        opp_type: initial.opp_type || "",
        opp_majors: initial.opp_majors || "",
        opp_link: initial.opp_link || "",
        opp_location: initial.opp_location || "",
        opp_eligibility: initial.opp_eligibility || "",
        opp_funding: initial.opp_funding || "",
      });
    } else {
      setForm((prev) => ({ ...prev, opp_name: "" }));
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
        <Label htmlFor="opp_name">Name</Label>
        <Input
          id="opp_name"
          value={form.opp_name || ""}
          onChange={(e) => handleChange("opp_name", e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="opp_type">Type</Label>
        <Input
          id="opp_type"
          value={form.opp_type || ""}
          onChange={(e) => handleChange("opp_type", e.target.value)}
          placeholder="Internship, Fellowship..."
        />
      </div>
      <div>
        <Label htmlFor="opp_host">Host</Label>
        <Input
          id="opp_host"
          value={form.opp_host || ""}
          onChange={(e) => handleChange("opp_host", e.target.value)}
          placeholder="Organization"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="opp_deadline">Deadline</Label>
          <Input
            id="opp_deadline"
            type="date"
            value={form.opp_deadline ? form.opp_deadline.slice(0, 10) : ""}
            onChange={(e) => handleChange("opp_deadline", e.target.value)}
          />
          <p className="text-xs text-gray-500">Leave empty for Year-round</p>
        </div>
        <div>
          <Label htmlFor="opp_majors">Majors</Label>
          <Input
            id="opp_majors"
            value={form.opp_majors || ""}
            onChange={(e) => handleChange("opp_majors", e.target.value)}
            placeholder="CS; EE"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="opp_description">Description</Label>
        <Input
          id="opp_description"
          value={form.opp_description || ""}
          onChange={(e) => handleChange("opp_description", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="opp_steps">Steps</Label>
          <Input
            id="opp_steps"
            value={form.opp_steps || ""}
            onChange={(e) => handleChange("opp_steps", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="opp_eligibility">Eligibility</Label>
          <Input
            id="opp_eligibility"
            value={form.opp_eligibility || ""}
            onChange={(e) => handleChange("opp_eligibility", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="opp_funding">Funding</Label>
          <Input
            id="opp_funding"
            value={form.opp_funding || ""}
            onChange={(e) => handleChange("opp_funding", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="opp_location">Location</Label>
          <Input
            id="opp_location"
            value={form.opp_location || ""}
            onChange={(e) => handleChange("opp_location", e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="opp_link">Link</Label>
        <Input
          id="opp_link"
          value={form.opp_link || ""}
          onChange={(e) => handleChange("opp_link", e.target.value)}
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
