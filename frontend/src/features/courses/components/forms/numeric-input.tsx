import { forwardRef } from "react";
import { Input, type InputProps } from "@/components/atoms/input";
import { useIsMacSafari } from '@/hooks/use-is-mac-safari';

interface NumericInputProps extends InputProps {
  allowDecimal?: boolean;
}

export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  ({ allowDecimal = true, inputMode, ...props }, ref) => {
    const isMacSafari = useIsMacSafari();
    const resolvedInputMode = inputMode ?? (allowDecimal ? "decimal" : "numeric");

    return (
      <Input
        ref={ref}
        inputMode={isMacSafari ? undefined : resolvedInputMode}
        {...props}
      />
    );
  },
);

NumericInput.displayName = "NumericInput";

