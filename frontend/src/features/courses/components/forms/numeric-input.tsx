import { forwardRef, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { useIsMacSafari } from '@/hooks/use-is-mac-safari';

interface NumericInputProps extends ComponentProps<"input"> {
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

