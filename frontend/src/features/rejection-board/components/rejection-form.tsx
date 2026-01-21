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

const TITLE_MAX_LENGTH = 120;
const REFLECTION_MAX_LENGTH = 800;

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
    if (form.title.trim().length > TITLE_MAX_LENGTH) {
      setError(`Title must be ${TITLE_MAX_LENGTH} characters or fewer.`);
      return;
    }
    if (!form.reflection.trim()) {
      setError("Reflection is required.");
      return;
    }
    if (form.reflection.trim().length > REFLECTION_MAX_LENGTH) {
      setError(`Reflection must be ${REFLECTION_MAX_LENGTH} characters or fewer.`);
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
          className="rounded-xl"
          maxLength={TITLE_MAX_LENGTH}
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Keep it short and specific.</span>
          <span>
            {form.title.length}/{TITLE_MAX_LENGTH}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Reflection</Label>
        <Textarea
          value={form.reflection}
          onChange={(event) => handleChange("reflection", event.target.value)}
          placeholder="What happened? What did you learn? Keep it kind and anonymous."
          className="min-h-[140px] rounded-xl"
          disabled={disabled || isSubmitting}
          maxLength={REFLECTION_MAX_LENGTH}
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Your story is posted completely anonymously.</span>
          <span>
            {form.reflection.length}/{REFLECTION_MAX_LENGTH}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Opportunity type</Label>
          <Select
            value={form.rejection_opportunity_type}
            onValueChange={(value) => handleChange("rejection_opportunity_type", value)}
            disabled={disabled || isSubmitting}
          >
            <SelectTrigger className="rounded-xl">
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
          <div className="grid grid-cols-2 gap-2 bg-muted/50 p-1 rounded-xl">
            <Button
              type="button"
              variant={form.is_accepted === "NO" ? "default" : "ghost"}
              onClick={() => handleChange("is_accepted", "NO")}
              disabled={disabled || isSubmitting}
              className="rounded-lg h-9 text-xs"
            >
              Rejected
            </Button>
            <Button
              type="button"
              variant={form.is_accepted === "YES" ? "default" : "ghost"}
              onClick={() => handleChange("is_accepted", "YES")}
              disabled={disabled || isSubmitting}
              className="rounded-lg h-9 text-xs"
            >
              Accepted
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Still trying for it?</Label>
        <div className="grid grid-cols-2 gap-2 bg-muted/50 p-1 rounded-xl">
          <Button
            type="button"
            variant={form.still_trying === "YES" ? "default" : "ghost"}
            onClick={() => handleChange("still_trying", "YES")}
            disabled={disabled || isSubmitting}
            className="rounded-lg h-9 text-xs"
          >
            Still trying
          </Button>
          <Button
            type="button"
            variant={form.still_trying === "NO" ? "default" : "ghost"}
            onClick={() => handleChange("still_trying", "NO")}
            disabled={disabled || isSubmitting}
            className="rounded-lg h-9 text-xs"
          >
            Moved on
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-4 border-t mt-6">
        <p className="text-xs text-muted-foreground text-center sm:text-left">
          Be honest, be respectful. We hide all personal identifiers.
        </p>
        <Button 
          type="submit" 
          disabled={disabled || isSubmitting}
          className="rounded-full px-8 w-full sm:w-auto"
        >
          {isSubmitting ? "Sharing..." : "Share your story"}
        </Button>
      </div>
    </form>
  );
};
