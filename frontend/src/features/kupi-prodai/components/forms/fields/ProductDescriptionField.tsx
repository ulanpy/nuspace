import { Textarea } from "@/components/atoms/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { FileText } from "lucide-react";
import { AnimatedFormField } from "@/components/organisms/animations/AnimatedFormField";
import { useFormAnimations } from "@/hooks/useFormAnimations";
import { fieldVariants } from "@/utils/animationVariants";

interface ProductDescriptionFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  placeholder?: string;
  showCharacterCount?: boolean;
}

export function ProductDescriptionField({ 
  value, 
  onChange, 
  rows = 4,
  placeholder = "Describe your item in detail...",
  showCharacterCount = true
}: ProductDescriptionFieldProps) {
  const { handleFieldFocus, handleFieldBlur, isFieldFocused } = useFormAnimations();

  return (
    <motion.div className="relative" variants={fieldVariants}>
      <AnimatedFormField
        label="Description"
        icon={<FileText className="h-4 w-4 text-primary" />}
        fieldName="description"
        isFocused={isFieldFocused('description')}
        onFocus={() => handleFieldFocus('description')}
        onBlur={handleFieldBlur}
      >
        <Textarea
          id="description"
          name="description"
          value={value}
          onChange={onChange}
          onFocus={() => handleFieldFocus('description')}
          onBlur={handleFieldBlur}
          rows={rows}
          className="resize-none transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder={placeholder}
        />
      </AnimatedFormField>
      
      {/* Character count animation */}
      {showCharacterCount && (
        <AnimatePresence>
          {isFieldFocused('description') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute -bottom-6 right-0 text-xs text-muted-foreground"
            >
              {value.length} characters
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}