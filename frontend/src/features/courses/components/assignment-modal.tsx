"use client";

import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Info, X } from "lucide-react";
import { Modal } from "@/components/atoms/modal";
import { Button } from "@/components/atoms/button";
import { NumericInput } from "./forms/numeric-input";
import { coursesSurface } from "../constants/dashboard-theme";
import { cn } from "@/utils/utils";

type AssignmentField = "name" | "weight" | "max" | "obtained";

export interface AssignmentModalProps {
  isOpen: boolean;
  title: string;
  itemName: string;
  onNameChange: (value: string) => void;
  weightValue: string;
  onWeightChange: (value: string) => void;
  maxValue: string;
  onMaxChange: (value: string) => void;
  obtainedValue: string;
  onObtainedChange: (value: string) => void;
  nameError?: string;
  weightError?: string;
  maxError?: string;
  obtainedError?: string;
  infoMessage?: string;
  extraContent?: ReactNode;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  cancelLabel?: string;
  isSubmitDisabled?: boolean;
}

const inputClassName = cn(
  "h-11 w-full rounded-xl border px-3.5 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
  coursesSurface.input,
);

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">{children}</label>;
}

function FieldHelper({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{children}</p>;
}

function FieldError({ message }: { message: string }) {
  return <p className="mt-1.5 text-xs leading-snug text-red-400">{message}</p>;
}

export function AssignmentModal({
  isOpen,
  title,
  itemName,
  onNameChange,
  weightValue,
  onWeightChange,
  maxValue,
  onMaxChange,
  obtainedValue,
  onObtainedChange,
  nameError,
  weightError,
  maxError,
  obtainedError,
  infoMessage,
  extraContent,
  onCancel,
  onSubmit,
  submitLabel,
  cancelLabel = "Cancel",
  isSubmitDisabled,
}: AssignmentModalProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [touched, setTouched] = useState<Partial<Record<AssignmentField, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTouched({});
    setSubmitAttempted(false);
    const frame = requestAnimationFrame(() => nameRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  const markTouched = (field: AssignmentField) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const shouldShowError = (field: AssignmentField, error?: string) =>
    Boolean(error && (touched[field] || submitAttempted));

  const showNameError = shouldShowError("name", nameError);
  const showWeightError = shouldShowError("weight", weightError);
  const showMaxError = shouldShowError("max", maxError);
  const showObtainedError = shouldShowError("obtained", obtainedError);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitAttempted(true);
    if (!isSubmitDisabled) {
      onSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      hideHeader
      className={cn("max-w-[540px] border shadow-2xl shadow-black/20", coursesSurface.cardSm)}
      contentClassName="rounded-2xl"
      bodyClassName="p-0"
    >
      <form onSubmit={handleSubmit} className="flex flex-col px-8 py-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 className="text-[26px] font-semibold leading-tight tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="mt-0.5 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {extraContent}

        <div className="space-y-5">
          <div>
            <FieldLabel>Assignment Name</FieldLabel>
            <input
              ref={nameRef}
              type="text"
              maxLength={15}
              value={itemName}
              placeholder="Midterm Exam"
              onChange={(event) => onNameChange(event.target.value)}
              onBlur={() => markTouched("name")}
              className={cn(inputClassName, showNameError && "border-red-500/70 focus-visible:ring-red-500/30")}
            />
            {showNameError && nameError ? (
              <FieldError message={nameError} />
            ) : (
              <FieldHelper>Used for GPA calculations and assignment tracking.</FieldHelper>
            )}
          </div>

          <div>
            <FieldLabel>Weight</FieldLabel>
            <div className="relative">
              <NumericInput
                placeholder="25"
                value={weightValue}
                onChange={(event) => onWeightChange(event.target.value)}
                onBlur={() => markTouched("weight")}
                className={cn(
                  inputClassName,
                  "pr-9",
                  showWeightError && "border-red-500/70 focus-visible:ring-red-500/30",
                )}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm font-medium text-muted-foreground">
                %
              </span>
            </div>
            {showWeightError && weightError ? (
              <FieldError message={weightError} />
            ) : (
              <FieldHelper>Percentage of the final grade, from 0 to 100.</FieldHelper>
            )}
          </div>

          <div className="space-y-3">
            <FieldLabel>Scores</FieldLabel>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Max Score</p>
                <NumericInput
                  placeholder="100"
                  value={maxValue}
                  onChange={(event) => onMaxChange(event.target.value)}
                  onBlur={() => markTouched("max")}
                  className={cn(
                    inputClassName,
                    showMaxError && "border-red-500/70 focus-visible:ring-red-500/30",
                  )}
                />
                {showMaxError && maxError && <FieldError message={maxError} />}
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Obtained Score</p>
                <NumericInput
                  placeholder="85"
                  value={obtainedValue}
                  onChange={(event) => onObtainedChange(event.target.value)}
                  onBlur={() => markTouched("obtained")}
                  className={cn(
                    inputClassName,
                    showObtainedError && "border-red-500/70 focus-visible:ring-red-500/30",
                  )}
                />
                {showObtainedError && obtainedError && <FieldError message={obtainedError} />}
              </div>
            </div>
          </div>
        </div>

        {infoMessage && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <p className="text-xs leading-relaxed text-muted-foreground">{infoMessage}</p>
          </div>
        )}

        <div className="mt-7 flex justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={onCancel} className="h-10 rounded-xl px-4">
            {cancelLabel}
          </Button>
          <Button type="submit" disabled={isSubmitDisabled} className="h-10 rounded-xl px-5">
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
