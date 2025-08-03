import { Textarea } from "@/components/atoms/textarea";
import { motion } from "framer-motion";
import { Tag } from "lucide-react";
import { AnimatedFormField } from "@/components/organisms/animations/AnimatedFormField";
import { useFormAnimations } from "@/hooks/useFormAnimations";
import { fieldVariants } from "@/utils/animationVariants";

interface ProductNameFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  required?: boolean;
  placeholder?: string;
}

export function ProductNameField({ 
  value, 
  onChange, 
  required = true,
  placeholder = "What are you selling?"
}: ProductNameFieldProps) {
  const { handleFieldFocus, handleFieldBlur, isFieldFocused } = useFormAnimations();

  return (
    <motion.div variants={fieldVariants}>
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
          className="resize-none min-h-[60px] transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder={placeholder}
        />
      </AnimatedFormField>
    </motion.div>
  );
}