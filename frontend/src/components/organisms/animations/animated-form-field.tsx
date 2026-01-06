import { motion } from "framer-motion";
import { Label } from "../../atoms/label";
import { ReactNode } from "react";

interface AnimatedFormFieldProps {
  label: string;
  icon: ReactNode;
  fieldName: string;
  isFocused: boolean;
  children: ReactNode;
  showFocusIndicator?: boolean;
  focusColor?: string;
  className?: string;
}

export function AnimatedFormField({
  label,
  icon,
  fieldName,
  isFocused,
  children,
  showFocusIndicator = true,
  focusColor = "primary",
  className = ""
}: AnimatedFormFieldProps) {
  return (
    <div className={`space-y-2 relative ${className}`}>
      <div className="flex items-center gap-2">
        <div className="transition-colors duration-200">
          {icon}
        </div>
        <Label htmlFor={fieldName} className="text-sm font-medium text-foreground">
          {label}
        </Label>
      </div>
      
      <div className="relative">
        {children}
      </div>
    </div>
  );
}