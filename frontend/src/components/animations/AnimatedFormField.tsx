import { motion, AnimatePresence } from "framer-motion";
import { Label } from "../atoms/label";
import { ReactNode } from "react";

interface AnimatedFormFieldProps {
  label: string;
  icon: ReactNode;
  fieldName: string;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
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
  onFocus,
  onBlur,
  children,
  showFocusIndicator = true,
  focusColor = "primary",
  className = ""
}: AnimatedFormFieldProps) {
  return (
    <div className={`space-y-2 relative ${className}`}>
      <motion.div
        className="flex items-center gap-2"
        animate={{ x: isFocused ? [0, 2, 0] : 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          animate={{ 
            scale: isFocused ? 1.1 : 1,
            rotate: isFocused ? [0, 10, 0] : 0
          }}
          transition={{ duration: 0.3 }}
        >
          {icon}
        </motion.div>
        <Label htmlFor={fieldName} className="text-sm font-medium text-foreground">
          {label}
        </Label>
      </motion.div>
      
      <motion.div
        whileFocus={{ scale: 1.02 }}
        className="relative"
      >
        {children}
        
        {/* Animated bottom border */}
        {showFocusIndicator && (
          <motion.div
            className={`absolute bottom-0 left-0 h-0.5 bg-${focusColor}`}
            initial={{ width: 0 }}
            animate={{ width: isFocused ? '100%' : 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </motion.div>
    </div>
  );
}