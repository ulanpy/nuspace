import { useState } from "react";

export function useFormAnimations() {
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleFieldFocus = (fieldName: string) => {
    setFocusedField(fieldName);
  };

  const handleFieldBlur = () => {
    setFocusedField(null);
  };

  const isFieldFocused = (fieldName: string) => {
    return focusedField === fieldName;
  };

  return {
    focusedField,
    handleFieldFocus,
    handleFieldBlur,
    isFieldFocused,
  };
}