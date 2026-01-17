"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import { Textarea } from "@/components/atoms/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select";
import {
  IsAccepted,
  RejectionBoardCreatePayload,
  REJECTION_TYPES,
  StillTrying,
  formatRejectionType,
} from "../types";

type Props = {
  onSubmit: (payload: RejectionBoardCreatePayload) => void;
  isSubmitting?: boolean;
  disabled?: boolean;
  resetToken?: number;
};

const DEFAULT_FORM: RejectionBoardCreatePayload = {
  title: "",
  reflection: "",
  rejection_opportunity_type: REJECTION_TYPES[0],
  is_accepted: "NO",
  still_trying: "YES",
};

export const RejectionBoardForm = ({
  onSubmit,
  isSubmitting = false,
  disabled = false,
  resetToken,
}: Props) => {
  const [form, setForm] = useState<RejectionBoardCreatePayload>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof resetToken === "number") {
      setForm(DEFAULT_FORM);
      setError(null);
    }
  }, [resetToken]);

  const typeOptions = useMemo(
    () => REJECTION_TYPES.map((value) => ({ value, label: formatRejectionType(value) })),
    [],
  );

  const handleChange = (
    key: keyof RejectionBoardCreatePayload,
    value: string | IsAccepted | StillTrying,
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("Please add a short title.");
      return;
    }
    if (!form.reflection.trim()) {
      setError("Reflection is required.");
      return;
    }
    setError(null);
    onSubmit({
      ...form,
      title: form.title.trim(),
      reflection: form.reflection.trim(),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={form.title}
          onChange={(event) => handleChange("title", event.target.value)}
          placeholder="Short summary of the outcome"
          disabled={disabled || isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label>Reflection</Label>
        <Textarea
          value={form.reflection}
          onChange={(event) => handleChange("reflection", event.target.value)}
          placeholder="What happened? What did you learn? Keep it kind and anonymous."
          className="min-h-[140px]"
          disabled={disabled || isSubmitting}
        />
        <p className="text-xs text-muted-foreground">
          Nickname is generated automatically. Please avoid personal details.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Opportunity type</Label>
          <Select
            value={form.rejection_opportunity_type}
            onValueChange={(value) => handleChange("rejection_opportunity_type", value)}
            disabled={disabled || isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Outcome</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={form.is_accepted === "NO" ? "default" : "outline"}
              onClick={() => handleChange("is_accepted", "NO")}
              disabled={disabled || isSubmitting}
            >
              Rejected
            </Button>
            <Button
              type="button"
              variant={form.is_accepted === "YES" ? "default" : "outline"}
              onClick={() => handleChange("is_accepted", "YES")}
              disabled={disabled || isSubmitting}
            >
              Accepted
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Still trying for it?</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={form.still_trying === "YES" ? "default" : "outline"}
            onClick={() => handleChange("still_trying", "YES")}
            disabled={disabled || isSubmitting}
          >
            Still trying
          </Button>
          <Button
            type="button"
            variant={form.still_trying === "NO" ? "default" : "outline"}
            onClick={() => handleChange("still_trying", "NO")}
            disabled={disabled || isSubmitting}
          >
            Moved on
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Be honest, be respectful. We hide all personal identifiers.
        </p>
        <Button type="submit" disabled={disabled || isSubmitting}>
          {isSubmitting ? "Sharing..." : "Share your story"}
        </Button>
      </div>
    </form>
  );
};
