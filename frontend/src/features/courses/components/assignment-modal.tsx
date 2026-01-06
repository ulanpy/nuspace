"use client";

import { ReactNode } from "react";
import { Modal } from "@/components/atoms/modal";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { NumericInput } from './forms/numeric-input';

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
  statusCard?: {
    tone: "ready" | "warning";
    title: string;
    message: string;
  };
  extraContent?: ReactNode;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  cancelLabel?: string;
  isSubmitDisabled?: boolean;
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
  statusCard,
  extraContent,
  onCancel,
  onSubmit,
  submitLabel,
  cancelLabel = "Cancel",
  isSubmitDisabled,
}: AssignmentModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      className="max-w-md"
      contentClassName="rounded-3xl"
    >
      <div className="space-y-4">
        {extraContent}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Item Name</label>
            <Input
              placeholder="e.g., Midterm Exam"
              maxLength={15}
              value={itemName}
              onChange={(e) => onNameChange(e.target.value)}
            />
            {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Weight (%)</label>
            <NumericInput
              placeholder="e.g., 25"
              value={weightValue}
              onChange={(e) => onWeightChange(e.target.value)}
            />
            {weightError && <p className="mt-1 text-xs text-red-600">{weightError}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium mb-2 block">Max Score</label>
            <NumericInput
              placeholder="e.g., 100"
              value={maxValue}
              onChange={(e) => onMaxChange(e.target.value)}
            />
            {maxError && <p className="mt-1 text-xs text-red-600">{maxError}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium mb-2 block">Obtained Score</label>
            <NumericInput
              placeholder="e.g., 85"
              value={obtainedValue}
              onChange={(e) => onObtainedChange(e.target.value)}
            />
            {obtainedError && <p className="mt-1 text-xs text-red-600">{obtainedError}</p>}
          </div>
        </div>

        {statusCard && (
          <div
            className={`rounded-lg border px-3 py-2 text-xs ${
              statusCard.tone === "ready"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            <p className="font-semibold">{statusCard.title}</p>
            <p>{statusCard.message}</p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitDisabled}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

