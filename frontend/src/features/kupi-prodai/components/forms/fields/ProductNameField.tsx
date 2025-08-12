import { Textarea } from "@/components/atoms/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { Tag } from "lucide-react";
import { AnimatedFormField } from "@/components/organisms/animations/AnimatedFormField";
import { useFormAnimations } from "@/hooks/useFormAnimations";
import { fieldVariants } from "@/utils/animationVariants";

interface ProductNameFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  required?: boolean;
  placeholder?: string;
  showCharacterCount?: boolean;
  maxLength?: number;
}

export function ProductNameField({ 
  value, 
  onChange, 
  required = true,
  placeholder = "What are you selling?",
  showCharacterCount = true,
  maxLength = 100
}: ProductNameFieldProps) {
  const { handleFieldFocus, handleFieldBlur, isFieldFocused } = useFormAnimations();

  return (
    <motion.div variants={fieldVariants} className="relative z-[2]">
      <AnimatedFormField
        label="Product Name"
        icon={<Tag className="h-4 w-4 text-primary" />}
        fieldName="name"
        isFocused={isFieldFocused('name')}
        onFocus={() => handleFieldFocus('name')}
        onBlur={handleFieldBlur}
      >
        <Textarea
          id="name"
          name="name"
          value={value}
          onChange={onChange}
          onFocus={() => handleFieldFocus('name')}
          onBlur={handleFieldBlur}
          required={required}
          maxLength={maxLength}
          className="resize-none min-h-[60px] transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary break-all [overflow-wrap:anywhere] break-words w-full"
          placeholder={placeholder}
        />
      </AnimatedFormField>
      
      {/* Character count animation */}
      {showCharacterCount && (
        <AnimatePresence>
          {isFieldFocused('name') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute -bottom-6 right-0"
            >
              <span className={`text-xs ${value.length > maxLength * 0.9 ? 'text-orange-500' : value.length === maxLength ? 'text-red-500' : 'text-gray-500'}`}>
                {value.length} / {maxLength}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}