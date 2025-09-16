import { Textarea } from "@/components/atoms/textarea";
import { FileText } from "lucide-react";
import { AnimatedFormField } from "@/components/organisms/animations/AnimatedFormField";
import { useFormAnimations } from "@/hooks/useFormAnimations";

interface ProductDescriptionFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  placeholder?: string;
  showCharacterCount?: boolean;
  maxLength?: number;
}

export function ProductDescriptionField({ 
  value, 
  onChange, 
  rows = 4,
  placeholder = "Describe your item in detail...",
  showCharacterCount = true,
  maxLength = 1000
}: ProductDescriptionFieldProps) {
  const { handleFieldFocus, handleFieldBlur, isFieldFocused } = useFormAnimations();

  return (
    <div className="relative z-[2]">
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
          maxLength={maxLength}
          className="resize-none transition-colors duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary break-all [overflow-wrap:anywhere] break-words w-full"
          placeholder={placeholder}
        />
      </AnimatedFormField>
      
      {/* Character count - simplified */}
      {showCharacterCount && isFieldFocused('description') && (
        <div className="absolute -bottom-6 right-0">
          <span className={`text-xs transition-colors duration-200 ${value.length > maxLength * 0.9 ? 'text-orange-500' : value.length === maxLength ? 'text-red-500' : 'text-gray-500'}`}>
            {value.length} / {maxLength}
          </span>
        </div>
      )}
    </div>
  );
}