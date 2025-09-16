import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select";
import { Zap } from "lucide-react";
import { AnimatedFormField } from "@/components/organisms/animations/AnimatedFormField";
import { useFormAnimations } from "@/hooks/useFormAnimations";

interface ProductCategoryFieldProps {
  value: string;
  onChange: (value: string) => void;
  categories: Types.DisplayCategory[];
  placeholder?: string;
}

export function ProductCategoryField({ 
  value, 
  onChange, 
  categories,
  placeholder = "Select category"
}: ProductCategoryFieldProps) {
  const { handleFieldFocus, handleFieldBlur, isFieldFocused } = useFormAnimations();

  const handleValueChange = (newValue: string) => {
    onChange(newValue);
  };

  return (
    <div className="relative z-[2]">
      <AnimatedFormField
        label="Category"
        icon={<Zap className="h-4 w-4 text-blue-500" />}
        fieldName="category"
        isFocused={isFieldFocused('category')}
        onFocus={() => handleFieldFocus('category')}
        onBlur={handleFieldBlur}
        showFocusIndicator={false}
      >
      <div>
        <Select 
          value={value} 
          onValueChange={handleValueChange}
        >
          <SelectTrigger 
            className="transition-colors duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            onFocus={() => handleFieldFocus('category')}
            onBlur={handleFieldBlur}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="z-[50]">
            {categories.slice(1).map((category, index) => (
              <SelectItem key={category.title} value={category.title}>
                {categories[index + 1].title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Hidden input to ensure category is included in FormData */}
        <input type="hidden" name="category" value={value} />
      </div>
    </AnimatedFormField>
    </div>
  );
}